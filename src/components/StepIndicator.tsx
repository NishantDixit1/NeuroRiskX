import React from 'react';
import { Check } from 'lucide-react';
import { FormStep } from '../types';
import { useStore } from '../store/useStore';

interface Props {
  steps: FormStep[];
}

export const StepIndicator: React.FC<Props> = ({ steps }) => {
  const currentStep = useStore((state) => state.currentStep);

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-center space-x-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                index <= currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {index < currentStep ? (
                <Check className="h-5 w-5" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-1 w-12 ${
                  index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 text-center">
        <h3 className="text-lg font-semibold">{steps[currentStep].title}</h3>
        <p className="text-sm text-gray-600">
          {steps[currentStep].description}
        </p>
      </div>
    </div>
  );
};