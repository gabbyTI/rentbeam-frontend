import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { generateId } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export const LandlordOnboarding: React.FC = () => {
  const [step, setStep] = useState(1);
  const [landlordData, setLandlordData] = useState({
    name: '',
    email: '',
  });
  const [propertyData, setPropertyData] = useState({
    name: '',
    address: '',
    units: [{ name: '', rentAmount: '', dueDay: '1' }],
  });

  const { landlords, properties, units, updateState } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleStep1Next = () => {
    if (!landlordData.name || !landlordData.email) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    setStep(3);
  };

  const addUnit = () => {
    setPropertyData({
      ...propertyData,
      units: [...propertyData.units, { name: '', rentAmount: '', dueDay: '1' }],
    });
  };

  const updateUnit = (index: number, field: string, value: string) => {
    const newUnits = [...propertyData.units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setPropertyData({ ...propertyData, units: newUnits });
  };

  const handleFinish = () => {
    if (!propertyData.name || !propertyData.address) {
      showToast('Please fill in property details', 'error');
      return;
    }

    const validUnits = propertyData.units.filter(
      (u) => u.name && u.rentAmount && u.dueDay
    );

    if (validUnits.length === 0) {
      showToast('Please add at least one unit', 'error');
      return;
    }

    // Create landlord
    const landlordId = generateId('landlord');
    const newLandlord = {
      id: landlordId,
      name: landlordData.name,
      email: landlordData.email,
      payoutsEnabled: true,
      createdAt: new Date().toISOString(),
    };

    // Create property
    const propertyId = generateId('property');
    const newProperty = {
      id: propertyId,
      landlordId,
      name: propertyData.name,
      address: propertyData.address,
      createdAt: new Date().toISOString(),
    };

    // Create units
    const newUnits = validUnits.map((u) => ({
      id: generateId('unit'),
      propertyId,
      name: u.name,
      rentAmount: parseFloat(u.rentAmount),
      dueDay: parseInt(u.dueDay),
      gracePeriodDays: 5, // Default grace period
      createdAt: new Date().toISOString(),
    }));

    updateState({
      landlords: [...landlords, newLandlord],
      properties: [...properties, newProperty],
      units: [...units, ...newUnits],
      currentUser: { role: 'landlord', id: landlordId },
    });

    showToast('Onboarding complete!');
    navigate('/landlord/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">RentTrack Lite</h1>
          <p className="mt-2 text-gray-600">Let's get you set up</p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                    s <= step
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      s < step ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-600">Profile</span>
            <span className="text-xs text-gray-600">Payouts</span>
            <span className="text-xs text-gray-600">Property</span>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Create Your Profile</h2>
              <Input
                label="Full Name"
                type="text"
                value={landlordData.name}
                onChange={(e) =>
                  setLandlordData({ ...landlordData, name: e.target.value })
                }
                placeholder="John Doe"
              />
              <Input
                label="Email"
                type="email"
                value={landlordData.email}
                onChange={(e) =>
                  setLandlordData({ ...landlordData, email: e.target.value })
                }
                placeholder="john@example.com"
              />
              <Button onClick={handleStep1Next} className="w-full">
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Enable Payouts</h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg
                    className="h-6 w-6 text-green-600 mr-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="font-medium text-green-900">Payouts Enabled</p>
                    <p className="text-sm text-green-700">
                      Your bank account is connected (simulated)
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                In the real app, autopay funds would be deposited to your connected bank
                account within 2-5 business days.
              </p>
              <div className="flex space-x-3">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={handleStep2Next} className="flex-1">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Add Your First Property</h2>
              <Input
                label="Property Name"
                type="text"
                value={propertyData.name}
                onChange={(e) =>
                  setPropertyData({ ...propertyData, name: e.target.value })
                }
                placeholder="Sunset Apartments"
              />
              <Input
                label="Address"
                type="text"
                value={propertyData.address}
                onChange={(e) =>
                  setPropertyData({ ...propertyData, address: e.target.value })
                }
                placeholder="123 Main St, Vancouver, BC"
              />

              <div className="mt-6">
                <h3 className="font-medium mb-3">Units</h3>
                {propertyData.units.map((unit, index) => (
                  <div key={index} className="grid grid-cols-3 gap-3 mb-3">
                    <Input
                      placeholder="Unit 101"
                      value={unit.name}
                      onChange={(e) => updateUnit(index, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="Rent ($)"
                      type="number"
                      value={unit.rentAmount}
                      onChange={(e) =>
                        updateUnit(index, 'rentAmount', e.target.value)
                      }
                    />
                    <Input
                      placeholder="Due day"
                      type="number"
                      min="1"
                      max="31"
                      value={unit.dueDay}
                      onChange={(e) => updateUnit(index, 'dueDay', e.target.value)}
                    />
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={addUnit}>
                  + Add Unit
                </Button>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={handleFinish} className="flex-1">
                  Finish Setup
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
