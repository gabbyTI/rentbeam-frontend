# RentBeam Lite

A simple rent tracking and tenant-enabled autopay application for small landlords managing 1-20 units. Built with React, TypeScript, and Tailwind CSS with mock data only (no real backend).

## Features

### For Landlords
- **Dashboard**: View rent collection status (Paid/Pending/Late) across all properties
- **Property Management**: Create properties and add units with rent details
- **Tenant Management**: Invite tenants via email and track their status
- **Payment Tracking**: Mark manual payments as received, view payment history
- **Autopay Demo**: Simulate autopay processing for testing
- **Reports**: View payment methods (Autopay vs Manual) and tenant details

### For Tenants
- **Invite Acceptance**: Accept landlord invitations and complete profile
- **Autopay Setup**: Enable card autopay with mock Stripe-like interface
- **Payment Dashboard**: View rent status, due dates, and payment history
- **Flexible Payments**: Choose between autopay or manual Interac payments
- **Payment History**: Track all rent payments with method labels

## Tech Stack

- **React 18** with TypeScript
- **React Router v6** for navigation
- **Tailwind CSS** for styling
- **Vite** for fast development
- **LocalStorage** for data persistence

## Getting Started

### Prerequisites

- Node.js 16+ and npm (or yarn/pnpm)

### Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Demo Credentials

The app comes pre-loaded with mock data. Use these credentials to explore:

**Landlords:**
- sarah@example.com
- michael@example.com

**Tenants:**
- emma.wilson@example.com (Autopay enabled)
- james.brown@example.com (Manual payment)

## User Flows

### Landlord Flow
1. Login or create account → Onboarding (profile, payouts, first property)
2. Add properties and units
3. Invite tenants by email and assign to units
4. View dashboard to see payment status
5. Mark manual payments as received
6. Run autopay demo to simulate automatic charges

### Tenant Flow
1. Receive invite email (simulated) with invite link `/invite/:token`
2. Accept invite and complete registration
3. View rent details and payment options
4. **Option A**: Enable autopay with card (mock form)
5. **Option B**: Pay manually via Interac outside app
6. View payment history and manage autopay

### Invite Flow Example
To test the invite flow, use one of the pre-created pending invites:
- Navigate to `/invite/invite-token-123` to accept an existing pending invite

## Key Concepts

### Money Handling
- **NO real payment processing** - this is a demo with mock data only
- Autopay is **tenant-enabled**, never landlord-forced
- Card details are **NOT stored** - only shows "Card •••• 4242" style labels
- Manual payments (Interac) happen **outside the app**
- Landlord receives payouts to **one bank account** (simulated)

### Payment Status Logic
- **Paid**: Payment recorded for current month
- **Pending**: Due date not yet passed, unpaid
- **Late**: Past due date and unpaid

### Data Persistence
All data is stored in browser localStorage as JSON. Clear localStorage to reset the app to initial mock data.

## Project Structure

```
src/
├── components/
│   ├── landlord/         # Landlord pages
│   ├── tenant/           # Tenant pages
│   ├── ui/               # Reusable UI components
│   └── Login.tsx         # Login page
├── context/
│   ├── AppContext.tsx    # Global state management
│   └── ToastContext.tsx  # Toast notifications
├── mock/
│   └── data.ts           # Mock data
├── types/
│   └── index.ts          # TypeScript types
├── utils/
│   └── helpers.ts        # Helper functions
├── App.tsx               # Main app with routing
├── main.tsx              # App entry point
└── index.css             # Global styles
```

## Development Notes

### State Management
- Global state managed with React Context API
- Persisted to localStorage on every update
- Includes landlords, properties, units, tenants, and payments

### Mock Data
- 2 landlords with multiple properties
- 6 tenants (some invited, some active)
- Mixed autopay/manual payment methods
- Pre-populated payment history

### Styling
- Tailwind CSS utility classes
- Custom color palette with primary blue theme
- Responsive design for mobile and desktop
- Reusable component library

## Future Enhancements (Not Implemented)

This is a frontend-only demo. In a real production app, you would add:

- Real backend API with authentication
- Actual Stripe Connect integration for payments
- Email/SMS notifications via Twilio/SendGrid
- Real database (PostgreSQL, MongoDB)
- Advanced reporting and analytics
- Multi-language support
- Receipt generation and download
- Lease management
- Maintenance request tracking

## License

This is a demo project for educational purposes.

## Support

This is a mock application with no real payment processing. For questions about implementation, refer to the inline code comments and component documentation.
