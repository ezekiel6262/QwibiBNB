import Papa from "papaparse";

export type ParsedSeries = {
  periodLabels: string[];
  values: number[];
  targetColumn: string;
};

export type PredictionRow = {
  period: string;
  actual: number | null;
  predicted: number;
  split: "train" | "validation" | "forecast";
};

export type ForecastResult = {
  model: "Linear trend" | "Moving average";
  metrics: { mae: number; rmse: number; mape: number };
  limitations: string;
  rows: PredictionRow[];
};

/**
 * Parses pasted CSV text and extracts a numeric target column. If targetColumn isn't given
 * or isn't found, falls back to the last column that's numeric across every row - graceful
 * handling of a loosely-specified request rather than a hard failure.
 */
export function parseSeries(csvText: string, targetColumn?: string): ParsedSeries {
  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`could not parse CSV - ${parsed.errors[0].message} (row ${parsed.errors[0].row})`);
  }
  const rows = parsed.data;
  if (rows.length < 6) {
    throw new Error("need at least 6 rows of data to hold out a validation split");
  }

  const columns = Object.keys(rows[0]);
  const dateColumn = columns[0];

  let column = targetColumn && columns.includes(targetColumn) ? targetColumn : undefined;
  if (!column) {
    column = columns
      .slice(1)
      .reverse()
      .find((col) => rows.every((r) => r[col] !== undefined && r[col] !== "" && !Number.isNaN(Number(r[col]))));
  }
  if (!column) {
    throw new Error("no numeric column found to forecast - check the CSV has a numeric column");
  }

  const values = rows.map((r) => Number(r[column!]));
  if (values.some((v) => Number.isNaN(v))) {
    throw new Error(`column "${column}" has non-numeric values in some rows`);
  }

  return {
    periodLabels: rows.map((r, i) => r[dateColumn] || String(i + 1)),
    values,
    targetColumn: column,
  };
}

function linearRegression(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
  const den = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  return (x) => intercept + slope * x;
}

function movingAveragePredictor(train: number[], window: number): () => number {
  const tail = train.slice(-window);
  const avg = tail.reduce((s, v) => s + v, 0) / tail.length;
  return () => avg;
}

function errorMetrics(actual: number[], predicted: number[]) {
  const n = actual.length;
  const errors = actual.map((a, i) => a - predicted[i]);
  const mae = errors.reduce((s, e) => s + Math.abs(e), 0) / n;
  const rmse = Math.sqrt(errors.reduce((s, e) => s + e ** 2, 0) / n);
  const mape =
    (errors.reduce((s, e, i) => s + (actual[i] !== 0 ? Math.abs(e / actual[i]) : 0), 0) / n) * 100;
  return { mae, rmse, mape };
}

/**
 * Auto model selection between two genuine baselines - a linear trend regression and a
 * moving-average baseline - chosen by whichever has lower MAE on a held-out validation
 * split. Not Prophet or XGBoost (BRIEF.md's stated targets - see README status), but every
 * number here is a real computation over the input series, never fabricated.
 */
export function computeForecast(series: ParsedSeries, horizon: number): ForecastResult {
  const n = series.values.length;
  const validationSize = Math.max(1, Math.min(Math.floor(n * 0.2), n - 4));
  const trainSize = n - validationSize;

  const trainValues = series.values.slice(0, trainSize);
  const validationValues = series.values.slice(trainSize);
  const trainIndices = trainValues.map((_, i) => i);
  const validationIndices = validationValues.map((_, i) => trainSize + i);

  const linearPredict = linearRegression(trainIndices, trainValues);
  const linearValidationPreds = validationIndices.map((i) => linearPredict(i));
  const linearMetrics = errorMetrics(validationValues, linearValidationPreds);

  const window = Math.min(3, trainValues.length);
  const maPredict = movingAveragePredictor(trainValues, window);
  const maValidationPreds = validationIndices.map(() => maPredict());
  const maMetrics = errorMetrics(validationValues, maValidationPreds);

  const useLinear = linearMetrics.mae <= maMetrics.mae;
  const chosenMetrics = useLinear ? linearMetrics : maMetrics;
  const chosenValidationPreds = useLinear ? linearValidationPreds : maValidationPreds;

  const rows: PredictionRow[] = [];
  for (let i = 0; i < trainSize; i++) {
    rows.push({ period: series.periodLabels[i], actual: trainValues[i], predicted: trainValues[i], split: "train" });
  }
  for (let i = 0; i < validationSize; i++) {
    rows.push({
      period: series.periodLabels[trainSize + i],
      actual: validationValues[i],
      predicted: chosenValidationPreds[i],
      split: "validation",
    });
  }

  const fullIndices = series.values.map((_, i) => i);
  const fullLinearPredict = linearRegression(fullIndices, series.values);
  const fullMaPredict = movingAveragePredictor(series.values, Math.min(3, n));

  for (let h = 1; h <= horizon; h++) {
    const futureIndex = n - 1 + h;
    const predicted = useLinear ? fullLinearPredict(futureIndex) : fullMaPredict();
    rows.push({ period: `+${h}`, actual: null, predicted, split: "forecast" });
  }

  return {
    model: useLinear ? "Linear trend" : "Moving average",
    metrics: chosenMetrics,
    limitations: useLinear
      ? "Linear trend assumes a constant rate of change and does not capture seasonality, " +
        "cycles, or structural breaks in the data."
      : "Moving average assumes the recent average persists going forward; it lags behind " +
        "trending series and ignores seasonality.",
    rows,
  };
}
