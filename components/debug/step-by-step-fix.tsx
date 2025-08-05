
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function StepByStepFix() {
  const [showGuide, setShowGuide] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "1. Open Vercel Dashboard",
      description: "Go to vercel.com/dashboard and find 'trainable-chatbot-alpha' project",
      action: "Click on your trainable-chatbot-alpha project",
      link: "https://vercel.com/dashboard"
    },
    {
      title: "2. Go to Environment Variables",
      description: "In your project, click Settings → Environment Variables",
      action: "Navigate to Settings tab, then Environment Variables section",
      link: null
    },
    {
      title: "3. Find NEXT_PUBLIC_SUPABASE_ANON_KEY",
      description: "Look for the environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY",
      action: "This should currently show: REPLACE_WITH_YOUR_ACTUAL_ANON_JWT_TOKEN",
      link: null
    },
    {
      title: "4. Get Your Real Supabase Key",
      description: "Open Supabase dashboard in a new tab",
      action: "Go to app.supabase.com → your project → Settings → API → copy 'anon public' key",
      link: "https://app.supabase.com"
    },
    {
      title: "5. Update the Environment Variable",
      description: "Replace the placeholder with your real JWT token",
      action: "Paste the JWT token that starts with 'eyJhbGciOiJIUzI1NiIs...'",
      link: null
    },
    {
      title: "6. Save and Deploy",
      description: "Save the changes and wait for Vercel to redeploy",
      action: "Vercel will automatically redeploy (takes 2-3 minutes)",
      link: null
    }
  ];

  if (!showGuide) {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <Button 
          onClick={() => setShowGuide(true)}
          className="bg-red-600 hover:bg-red-700 text-white animate-pulse"
        >
          🚨 Fix Chat Error
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="text-red-500" />
            Fix "Failed to send message" Error
          </CardTitle>
          <CardDescription>
            Step-by-step guide to fix your Vercel environment variables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div 
                key={index}
                className={`border rounded-lg p-4 ${
                  index === currentStep ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                } ${index < currentStep ? 'border-green-500 bg-green-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {index < currentStep ? (
                      <CheckCircle className="text-green-500" size={20} />
                    ) : index === currentStep ? (
                      <AlertCircle className="text-blue-500" size={20} />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    <p className="text-sm font-medium mt-2">{step.action}</p>
                    {step.link && (
                      <a 
                        href={step.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm underline mt-1 inline-block"
                      >
                        Open {step.link} →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-6">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              Previous Step
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowGuide(false)}
              >
                Close Guide
              </Button>
              <Button 
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={currentStep === steps.length - 1}
              >
                Next Step
              </Button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="font-semibold text-red-800 mb-2">🎯 Most Important:</h4>
            <p className="text-red-700 text-sm">
              The key fix is Step 5: Replace "REPLACE_WITH_YOUR_ACTUAL_ANON_JWT_TOKEN" 
              with your real Supabase JWT token that starts with "eyJhbGciOiJIUzI1NiIs..."
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
