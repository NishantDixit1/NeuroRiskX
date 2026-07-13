import React from 'react';
import { useForm } from 'react-hook-form';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  HeartPulse,
  Home,
  Loader2,
  User,
  X,
} from 'lucide-react';
import { PatientData } from '../types';

interface PatientFormProps {
  onSubmit: (data: PatientData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onDismissError: () => void;
}

/**
 * Radio inputs always post strings ("true" / "false"), and react-hook-form's
 * `setValueAs` does not run on radios. So the raw form model keeps those two
 * answers as strings, and `submit` below is the single place they become real
 * booleans. This is the bug that mattered: `!!"false"` is true, so a patient
 * answering "no hypertension" was once scored as hypertensive.
 */
type FormValues = Omit<PatientData, 'hypertension' | 'heartDisease'> & {
  hypertension: 'true' | 'false';
  heartDisease: 'true' | 'false';
};

const FIELD_ORDER: (keyof FormValues)[] = [
  'age',
  'gender',
  'bmi',
  'avgGlucoseLevel',
  'hypertension',
  'heartDisease',
  'smokingStatus',
  'workType',
  'residenceType',
  'everMarried',
];

const INPUT =
  'mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20';

const SELECT =
  'w-full appearance-none rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20';

const LABEL = 'text-xs font-semibold uppercase tracking-wide text-gray-600';

const RADIO_CARD =
  'flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/70 has-[:checked]:text-blue-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600/30';

const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-700">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  ) : null;

/** The numbered-field treatment carried over from the auth screens. */
const FieldShell: React.FC<{
  index: string;
  label: string;
  htmlFor?: string;
  labelId?: string;
  counted: boolean;
  children: React.ReactNode;
}> = ({ index, label, htmlFor, labelId, counted, children }) => (
  <div className="flex gap-4">
    <span className="pt-0.5 font-mono text-xs text-gray-400" aria-hidden="true">
      {index}
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-3">
        {htmlFor ? (
          <label htmlFor={htmlFor} className={LABEL}>
            {label}
          </label>
        ) : (
          <span id={labelId} className={LABEL}>
            {label}
          </span>
        )}
        <span
          className={`font-mono text-[11px] ${counted ? 'text-blue-600' : 'text-gray-400'}`}
        >
          {counted ? 'counted' : 'pending'}
        </span>
      </div>
      {children}
    </div>
  </div>
);

const SectionHeader: React.FC<{
  icon: typeof User;
  step: string;
  title: string;
  description: string;
}> = ({ icon: Icon, step, title, description }) => (
  <div className="flex items-start gap-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
    <div>
      <p className="font-mono text-[11px] uppercase tracking-wide text-gray-400">
        Section {step} of 3
      </p>
      <h3 className="text-base font-semibold tracking-tight text-gray-900">{title}</h3>
      <p className="mt-0.5 text-sm text-gray-600">{description}</p>
    </div>
  </div>
);

export const PatientForm: React.FC<PatientFormProps> = ({
  onSubmit,
  isLoading,
  error,
  onDismissError,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onTouched' });

  const watched = watch();
  const isFilled = (key: keyof FormValues) => {
    // `false` and `0` are legitimate answers, so only blank values count as unfilled.
    const value: unknown = watched[key];
    if (value === undefined || value === null || value === '') return false;
    if (typeof value === 'number' && Number.isNaN(value)) return false;
    return true;
  };
  const counted = FIELD_ORDER.filter(isFilled).length;

  const submit = async (raw: FormValues) => {
    // The one and only place the radio strings become booleans.
    const data: PatientData = {
      ...raw,
      hypertension: raw.hypertension === 'true',
      heartDisease: raw.heartDisease === 'true',
    };
    try {
      await onSubmit(data);
    } catch {
      // Failures surface through the `error` prop from the parent.
    }
  };

  /** A bordered yes/no or multi-option radio card. The input stays a real radio. */
  const radioCard = (
    name: 'gender' | 'everMarried' | 'residenceType' | 'smokingStatus' | 'hypertension' | 'heartDisease',
    value: string,
    label: string,
    requiredMessage: string,
  ) => (
    <label className={RADIO_CARD}>
      <input
        type="radio"
        value={value}
        className="peer sr-only"
        {...register(name, { required: requiredMessage })}
      />
      <span>{label}</span>
      <Check
        className="h-4 w-4 shrink-0 text-blue-600 opacity-0 transition-opacity peer-checked:opacity-100"
        aria-hidden="true"
      />
    </label>
  );

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header: the intake explains its own completeness, ledger-style */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">
            Patient intake
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Ten answers. The model scores exactly what you enter here, nothing else.
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm tabular-nums text-gray-900" aria-live="polite">
            {String(counted).padStart(2, '0')}
            <span className="text-gray-400"> / 10 counted</span>
          </p>
          <div
            className="mt-1.5 h-1 w-36 overflow-hidden rounded-full bg-gray-200"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(counted / FIELD_ORDER.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-sm text-rose-800">
            <p className="font-semibold">Could not complete the assessment</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={onDismissError}
            aria-label="Dismiss error"
            className="rounded p-0.5 text-rose-500 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="mt-6 rounded-2xl border border-gray-200 bg-white"
      >
        {/* ---------- Section 1 · Basic information ---------- */}
        <section className="p-6 sm:p-8">
          <SectionHeader
            icon={User}
            step="1"
            title="Basic information"
            description="Age, sex and the two measurements the model weighs most."
          />

          <div className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            <FieldShell index="01" label="Age" htmlFor="age" counted={isFilled('age')}>
              <input
                id="age"
                type="number"
                inputMode="numeric"
                placeholder="Years"
                aria-invalid={errors.age ? true : undefined}
                aria-describedby={errors.age ? 'age-error' : undefined}
                {...register('age', {
                  required: 'Age is required',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Age must be at least 1' },
                  max: { value: 120, message: 'Age must be 120 or below' },
                })}
                className={INPUT}
              />
              <FieldError id="age-error" message={errors.age?.message} />
            </FieldShell>

            <FieldShell
              index="02"
              label="Gender"
              labelId="gender-label"
              counted={isFilled('gender')}
            >
              <div
                role="radiogroup"
                aria-labelledby="gender-label"
                className="mt-1.5 grid grid-cols-2 gap-2.5"
              >
                {radioCard('gender', 'male', 'Male', 'Please select a gender')}
                {radioCard('gender', 'female', 'Female', 'Please select a gender')}
              </div>
              <FieldError id="gender-error" message={errors.gender?.message} />
            </FieldShell>

            <FieldShell index="03" label="BMI" htmlFor="bmi" counted={isFilled('bmi')}>
              <input
                id="bmi"
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="e.g. 24.5"
                aria-invalid={errors.bmi ? true : undefined}
                aria-describedby={errors.bmi ? 'bmi-error' : undefined}
                {...register('bmi', {
                  required: 'BMI is required',
                  valueAsNumber: true,
                  min: { value: 10, message: 'BMI must be at least 10' },
                  max: { value: 60, message: 'BMI must be 60 or below' },
                })}
                className={INPUT}
              />
              <FieldError id="bmi-error" message={errors.bmi?.message} />
            </FieldShell>

            <FieldShell
              index="04"
              label="Average glucose level (mg/dL)"
              htmlFor="avgGlucoseLevel"
              counted={isFilled('avgGlucoseLevel')}
            >
              <input
                id="avgGlucoseLevel"
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="e.g. 105"
                aria-invalid={errors.avgGlucoseLevel ? true : undefined}
                aria-describedby={errors.avgGlucoseLevel ? 'glucose-error' : undefined}
                {...register('avgGlucoseLevel', {
                  required: 'Average glucose level is required',
                  valueAsNumber: true,
                  min: { value: 40, message: 'Glucose must be at least 40' },
                  max: { value: 400, message: 'Glucose must be 400 or below' },
                })}
                className={INPUT}
              />
              <FieldError id="glucose-error" message={errors.avgGlucoseLevel?.message} />
            </FieldShell>
          </div>
        </section>

        {/* ---------- Section 2 · Medical history ---------- */}
        <section className="border-t border-gray-100 p-6 sm:p-8">
          <SectionHeader
            icon={HeartPulse}
            step="2"
            title="Medical history"
            description="Diagnosed conditions only. If it was never diagnosed, answer no."
          />

          <div className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            <FieldShell
              index="05"
              label="Diagnosed hypertension"
              labelId="hypertension-label"
              counted={isFilled('hypertension')}
            >
              <div
                role="radiogroup"
                aria-labelledby="hypertension-label"
                className="mt-1.5 grid grid-cols-2 gap-2.5"
              >
                {radioCard('hypertension', 'true', 'Yes', 'Please answer this question')}
                {radioCard('hypertension', 'false', 'No', 'Please answer this question')}
              </div>
              <FieldError id="hypertension-error" message={errors.hypertension?.message} />
            </FieldShell>

            <FieldShell
              index="06"
              label="Diagnosed heart disease"
              labelId="heart-disease-label"
              counted={isFilled('heartDisease')}
            >
              <div
                role="radiogroup"
                aria-labelledby="heart-disease-label"
                className="mt-1.5 grid grid-cols-2 gap-2.5"
              >
                {radioCard('heartDisease', 'true', 'Yes', 'Please answer this question')}
                {radioCard('heartDisease', 'false', 'No', 'Please answer this question')}
              </div>
              <FieldError id="heart-disease-error" message={errors.heartDisease?.message} />
            </FieldShell>
          </div>
        </section>

        {/* ---------- Section 3 · Lifestyle ---------- */}
        <section className="border-t border-gray-100 p-6 sm:p-8">
          <SectionHeader
            icon={Home}
            step="3"
            title="Lifestyle"
            description="How you live and work. These carry real weight in the model."
          />

          <div className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            <FieldShell
              index="07"
              label="Smoking status"
              labelId="smoking-label"
              counted={isFilled('smokingStatus')}
            >
              <div
                role="radiogroup"
                aria-labelledby="smoking-label"
                className="mt-1.5 grid grid-cols-2 gap-2.5"
              >
                {radioCard('smokingStatus', 'never_smoked', 'Never smoked', 'Please select a smoking status')}
                {radioCard('smokingStatus', 'formerly_smoked', 'Formerly smoked', 'Please select a smoking status')}
                {radioCard('smokingStatus', 'smokes', 'Smokes', 'Please select a smoking status')}
                {radioCard('smokingStatus', 'unknown', 'Prefer not to say', 'Please select a smoking status')}
              </div>
              <FieldError id="smoking-error" message={errors.smokingStatus?.message} />
            </FieldShell>

            <FieldShell
              index="08"
              label="Work type"
              htmlFor="workType"
              counted={isFilled('workType')}
            >
              <div className="relative mt-1.5">
                <select
                  id="workType"
                  aria-invalid={errors.workType ? true : undefined}
                  aria-describedby={errors.workType ? 'work-type-error' : undefined}
                  {...register('workType', { required: 'Please select a work type' })}
                  className={SELECT}
                >
                  <option value="">Select work type</option>
                  <option value="private">Private sector</option>
                  <option value="self-employed">Self-employed</option>
                  <option value="govt_job">Government job</option>
                  <option value="children">Child / dependent</option>
                  <option value="never_worked">Never worked</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
              </div>
              <FieldError id="work-type-error" message={errors.workType?.message} />
            </FieldShell>

            <FieldShell
              index="09"
              label="Residence type"
              labelId="residence-label"
              counted={isFilled('residenceType')}
            >
              <div
                role="radiogroup"
                aria-labelledby="residence-label"
                className="mt-1.5 grid grid-cols-2 gap-2.5"
              >
                {radioCard('residenceType', 'urban', 'Urban', 'Please select a residence type')}
                {radioCard('residenceType', 'rural', 'Rural', 'Please select a residence type')}
              </div>
              <FieldError id="residence-error" message={errors.residenceType?.message} />
            </FieldShell>

            <FieldShell
              index="10"
              label="Ever married"
              labelId="married-label"
              counted={isFilled('everMarried')}
            >
              <div
                role="radiogroup"
                aria-labelledby="married-label"
                className="mt-1.5 grid grid-cols-2 gap-2.5"
              >
                {radioCard('everMarried', 'yes', 'Yes', 'Please answer this question')}
                {radioCard('everMarried', 'no', 'No', 'Please answer this question')}
              </div>
              <FieldError id="married-error" message={errors.everMarried?.message} />
            </FieldShell>
          </div>
        </section>

        {/* Footer: one submit path, honest microcopy */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-b-2xl border-t border-gray-100 bg-gray-50/70 px-6 py-5 sm:px-8">
          <p className="font-mono text-[11px] leading-relaxed text-gray-500">
            Your answers go to the model exactly as entered.
          </p>
          <div className="flex flex-col items-end gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Scoring your answers
                </>
              ) : (
                <>
                  Get my risk score
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
            {hasErrors && (
              <p className="text-xs text-rose-700" role="alert">
                Some answers are missing or out of range. Check the highlighted fields.
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default PatientForm;
