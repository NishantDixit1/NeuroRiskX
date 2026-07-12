import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Activity, Heart, Home, Briefcase, AlertCircle } from 'lucide-react';
import { PatientData } from '../types';
import { useStore } from '../store/useStore';

interface Props {
  onNext: () => void;
}

const SECTIONS = [
  { title: 'Basic Information', icon: Activity, fields: ['age', 'gender', 'bmi', 'avgGlucoseLevel'] },
  { title: 'Medical History', icon: Heart, fields: ['hypertension', 'heartDisease'] },
  { title: 'Lifestyle', icon: Home, fields: ['workType', 'residenceType', 'smokingStatus', 'everMarried'] },
] as const;

const TOTAL_FIELDS = SECTIONS.reduce((acc, s) => acc + s.fields.length, 0);

/**
 * Radio inputs always post strings ("true" / "false"), and react-hook-form's
 * `setValueAs` does NOT apply to radios (it only runs for text/number inputs).
 * So the raw form model types those two fields as strings, and `onSubmit` is the
 * single place they become real booleans.
 *
 * This is the bug that mattered: previously `!!"false"` evaluated to true, so a
 * patient answering "no hypertension" was scored as hypertensive.
 */
type FormValues = Omit<PatientData, 'hypertension' | 'heartDisease'> & {
  hypertension: 'true' | 'false';
  heartDisease: 'true' | 'false';
};

const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <p className="mt-1 flex items-center gap-1 text-sm text-red-600">
      <AlertCircle className="h-4 w-4" />
      {message}
    </p>
  ) : null;

export const PatientForm: React.FC<Props> = ({ onNext }) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onTouched' });

  const { submitPatientData, isLoading, error, setError } = useStore();
  const [currentSection, setCurrentSection] = useState(0);

  const watched = watch();
  const filled = SECTIONS.flatMap((s) => s.fields).filter((f) => {
    // `false` and `0` are legitimate answers, so only blank values count as unfilled.
    const value: unknown = watched[f as keyof FormValues];
    return value !== undefined && value !== null && value !== '';
  }).length;
  const progress = Math.round((filled / TOTAL_FIELDS) * 100);

  /**
   * Single submit path. The old version called the store AND a raw fetch,
   * hitting the backend twice with two different payloads.
   */
  const onSubmit = async (raw: FormValues) => {
    // The one and only place radio strings become booleans.
    const data: PatientData = {
      ...raw,
      hypertension: raw.hypertension === 'true',
      heartDisease: raw.heartDisease === 'true',
    };
    await submitPatientData(data);
    // Only advance if the request succeeded (the store clears error on success).
    if (!useStore.getState().error) onNext();
  };

  return (
    <div className="mx-auto max-w-4xl">
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Could not complete the assessment</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Form progress</span>
          <span className="text-sm font-medium text-blue-600">{progress}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-gray-200">
          <div
            className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Section tabs */}
        <div className="mb-8 flex justify-center gap-4">
          {SECTIONS.map((section, idx) => {
            const Icon = section.icon;
            return (
              <button
                key={section.title}
                type="button"
                onClick={() => setCurrentSection(idx)}
                className={`flex flex-col items-center rounded-lg p-4 transition-all ${
                  currentSection === idx
                    ? 'border-2 border-blue-200 bg-blue-50 text-blue-600'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">{section.title}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-lg">
          {/* ---------- Basic information ---------- */}
          {currentSection === 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <h3 className="col-span-full text-lg font-semibold text-gray-900">Basic Information</h3>

              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</label>
                <input
                  id="age"
                  type="number"
                  {...register('age', {
                    required: 'Age is required',
                    valueAsNumber: true,
                    min: { value: 1, message: 'Age must be at least 1' },
                    max: { value: 120, message: 'Age must be 120 or below' },
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="years"
                />
                <FieldError message={errors.age?.message} />
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                <select
                  id="gender"
                  {...register('gender', { required: 'Please select a gender' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <FieldError message={errors.gender?.message} />
              </div>

              <div>
                <label htmlFor="bmi" className="block text-sm font-medium text-gray-700">BMI</label>
                <input
                  id="bmi"
                  type="number"
                  step="0.1"
                  {...register('bmi', {
                    required: 'BMI is required',
                    valueAsNumber: true,
                    min: { value: 10, message: 'BMI must be at least 10' },
                    max: { value: 60, message: 'BMI must be 60 or below' },
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g. 24.5"
                />
                <FieldError message={errors.bmi?.message} />
              </div>

              <div>
                <label htmlFor="avgGlucoseLevel" className="block text-sm font-medium text-gray-700">
                  Average glucose level (mg/dL)
                </label>
                <input
                  id="avgGlucoseLevel"
                  type="number"
                  step="0.1"
                  {...register('avgGlucoseLevel', {
                    required: 'Average glucose level is required',
                    valueAsNumber: true,
                    min: { value: 40, message: 'Glucose must be at least 40' },
                    max: { value: 400, message: 'Glucose must be 400 or below' },
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g. 105"
                />
                <FieldError message={errors.avgGlucoseLevel?.message} />
              </div>
            </div>
          )}

          {/* ---------- Medical history ---------- */}
          {currentSection === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Medical History</h3>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-gray-700">
                    Have you been diagnosed with hypertension?
                  </legend>
                  <div className="flex gap-6">
                    <label className="inline-flex items-center">
                      <input type="radio" value="true"
                        {...register('hypertension', { required: 'Please answer this question' })}
                        className="form-radio text-blue-600" />
                      <span className="ml-2">Yes</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" value="false"
                        {...register('hypertension', { required: 'Please answer this question' })}
                        className="form-radio text-blue-600" />
                      <span className="ml-2">No</span>
                    </label>
                  </div>
                  <FieldError message={errors.hypertension?.message} />
                </fieldset>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-gray-700">
                    Have you been diagnosed with heart disease?
                  </legend>
                  <div className="flex gap-6">
                    <label className="inline-flex items-center">
                      <input type="radio" value="true"
                        {...register('heartDisease', { required: 'Please answer this question' })}
                        className="form-radio text-blue-600" />
                      <span className="ml-2">Yes</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" value="false"
                        {...register('heartDisease', { required: 'Please answer this question' })}
                        className="form-radio text-blue-600" />
                      <span className="ml-2">No</span>
                    </label>
                  </div>
                  <FieldError message={errors.heartDisease?.message} />
                </fieldset>
              </div>
            </div>
          )}

          {/* ---------- Lifestyle ---------- */}
          {currentSection === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Lifestyle</h3>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="workType" className="block text-sm font-medium text-gray-700">Work type</label>
                  <div className="relative">
                    <select
                      id="workType"
                      {...register('workType', { required: 'Please select a work type' })}
                      className="mt-1 block w-full rounded-md border-gray-300 pl-10 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select work type</option>
                      <option value="private">Private</option>
                      <option value="self-employed">Self-employed</option>
                      <option value="govt_job">Government job</option>
                      <option value="children">Children</option>
                      <option value="never_worked">Never worked</option>
                    </select>
                    <Briefcase className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  </div>
                  <FieldError message={errors.workType?.message} />
                </div>

                <div>
                  <label htmlFor="residenceType" className="block text-sm font-medium text-gray-700">Residence type</label>
                  <div className="relative">
                    <select
                      id="residenceType"
                      {...register('residenceType', { required: 'Please select a residence type' })}
                      className="mt-1 block w-full rounded-md border-gray-300 pl-10 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select residence type</option>
                      <option value="urban">Urban</option>
                      <option value="rural">Rural</option>
                    </select>
                    <Home className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  </div>
                  <FieldError message={errors.residenceType?.message} />
                </div>

                <div>
                  <label htmlFor="smokingStatus" className="block text-sm font-medium text-gray-700">Smoking status</label>
                  {/* Options match the API contract exactly. The old form offered
                      "previously_smoked", which the backend rejects with a 422. */}
                  <select
                    id="smokingStatus"
                    {...register('smokingStatus', { required: 'Please select a smoking status' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select smoking status</option>
                    <option value="never_smoked">Never smoked</option>
                    <option value="formerly_smoked">Formerly smoked</option>
                    <option value="smokes">Smokes</option>
                    <option value="unknown">Prefer not to say</option>
                  </select>
                  <FieldError message={errors.smokingStatus?.message} />
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-gray-700">Ever married?</legend>
                  <div className="flex gap-6">
                    <label className="inline-flex items-center">
                      <input type="radio" value="yes"
                        {...register('everMarried', { required: 'Please answer this question' })}
                        className="form-radio text-blue-600" />
                      <span className="ml-2">Yes</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" value="no"
                        {...register('everMarried', { required: 'Please answer this question' })}
                        className="form-radio text-blue-600" />
                      <span className="ml-2">No</span>
                    </label>
                  </div>
                  <FieldError message={errors.everMarried?.message} />
                </fieldset>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentSection((s) => s - 1)}
              disabled={currentSection === 0}
              className="rounded-lg bg-gray-600 px-6 py-2 text-sm font-medium text-white disabled:invisible"
            >
              Previous
            </button>

            {currentSection < SECTIONS.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentSection((s) => s + 1)}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Analysing...' : 'Get risk assessment'}
              </button>
            )}
          </div>

          {/* Submitting from any section validates the whole form, so tell the user
              where the problem is rather than failing silently. */}
          {Object.keys(errors).length > 0 && currentSection === SECTIONS.length - 1 && (
            <p className="mt-4 text-sm text-red-600">
              Some required answers are missing. Check the earlier sections.
            </p>
          )}
        </div>
      </form>
    </div>
  );
};
