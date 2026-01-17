import { useState } from 'react';

import {
  AnalyticsWidget,
  RevenueChart,
  SessionStats,
  UserActivityWidget,
} from '../../components/Dashboard';
import { useAuth } from '../../contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

type DashboardView =
  | 'overview'
  | 'analytics'
  | 'sessions'
  | 'timeslots'
  | 'bookingtypes'
  | 'customservices'
  | 'discounts'
  | 'clients'
  | 'content'
  | 'settings';

interface SidebarItem {
  id: DashboardView;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// ============================================================================
// Sidebar Configuration
// ============================================================================

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0'
        />
      </svg>
    ),
    description: 'Dashboard overview with key metrics and analytics',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
        />
      </svg>
    ),
    description: 'Detailed analytics and performance metrics',
  },
  {
    id: 'sessions',
    label: 'Sessions',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
        />
      </svg>
    ),
    description: 'Manage upcoming and past sessions',
  },
  {
    id: 'customservices',
    label: 'Custom Services',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4'
        />
      </svg>
    ),
    description: 'Create and manage personalized service offerings',
  },
  {
    id: 'clients',
    label: 'Client Management',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z'
        />
      </svg>
    ),
    description: 'View and manage your clients and their activity',
  },
  {
    id: 'content',
    label: 'Content Management',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
        />
      </svg>
    ),
    description: 'Edit home page content and profile information',
  },
  {
    id: 'timeslots',
    label: 'Time Slots',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
        />
      </svg>
    ),
    description: 'Manage available time slots for booking',
  },
  {
    id: 'bookingtypes',
    label: 'Booking Types',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
        />
      </svg>
    ),
    description: 'Configure service types and pricing',
  },
  {
    id: 'discounts',
    label: 'Discounts',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
        />
      </svg>
    ),
    description: 'Create and manage discount codes',
  },
];

// ============================================================================
// Sidebar Component
// ============================================================================

function Sidebar({
  activeView,
  onViewChange,
}: {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}) {
  return (
    <div className='w-64 bg-gray-800 border-r border-gray-700 flex flex-col'>
      {/* Header */}
      <div className='p-6 border-b border-gray-700'>
        <h2 className='text-xl font-bold text-white'>Coach Dashboard</h2>
        <p className='text-sm text-gray-400 mt-1'>Manage your coaching business</p>
      </div>

      {/* Navigation */}
      <nav className='flex-1 p-4 space-y-2'>
        {SIDEBAR_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              activeView === item.id
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
            title={item.description}
          >
            {item.icon}
            <span className='font-medium'>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className='p-4 border-t border-gray-700'>
        <div className='text-xs text-gray-500'>
          <p>Coach Dashboard v2.0</p>
          <p>Enhanced Analytics & Management</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Overview View Component
// ============================================================================

function OverviewView() {
  return (
    <div className='space-y-6'>
      {/* Welcome Section */}
      <div className='bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-lg p-6 border border-orange-500/30'>
        <h2 className='text-2xl font-bold text-white mb-2'>Welcome to Your Dashboard</h2>
        <p className='text-gray-300'>
          Get insights into your coaching business with comprehensive analytics and management
          tools.
        </p>
      </div>

      {/* Quick Stats */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <AnalyticsWidget title='Quick Analytics' timeRange='last_30_days' showControls={false} />
        <UserActivityWidget showRealTime={true} />
      </div>

      {/* Revenue and Sessions */}
      <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
        <RevenueChart showDetails={false} />
        <SessionStats showTimeSlotAnalysis={false} />
      </div>
    </div>
  );
}

// ============================================================================
// Analytics View Component
// ============================================================================

function AnalyticsView() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold text-white'>Detailed Analytics</h2>
        <div className='text-sm text-gray-400'>
          Comprehensive insights into your coaching performance
        </div>
      </div>

      <AnalyticsWidget title='Complete Analytics Dashboard' />

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
        <UserActivityWidget />
        <SessionStats />
      </div>

      <RevenueChart />
    </div>
  );
}

// ============================================================================
// Client Management View Component
// ============================================================================

function ClientManagementView() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold text-white'>Client Management</h2>
        <button className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors'>
          Export Client List
        </button>
      </div>

      {/* Client Statistics */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div className='bg-gray-700 rounded-lg p-4 border border-blue-500/30'>
          <div className='flex items-center gap-2 mb-2'>
            <svg
              className='w-5 h-5 text-blue-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z'
              />
            </svg>
            <h3 className='text-sm font-medium text-gray-300'>Total Clients</h3>
          </div>
          <p className='text-2xl font-bold text-white'>--</p>
          <p className='text-xs text-gray-400'>Loading...</p>
        </div>

        <div className='bg-gray-700 rounded-lg p-4 border border-green-500/30'>
          <div className='flex items-center gap-2 mb-2'>
            <svg
              className='w-5 h-5 text-green-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <h3 className='text-sm font-medium text-gray-300'>Active Clients</h3>
          </div>
          <p className='text-2xl font-bold text-white'>--</p>
          <p className='text-xs text-gray-400'>Loading...</p>
        </div>

        <div className='bg-gray-700 rounded-lg p-4 border border-orange-500/30'>
          <div className='flex items-center gap-2 mb-2'>
            <svg
              className='w-5 h-5 text-orange-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
              />
            </svg>
            <h3 className='text-sm font-medium text-gray-300'>New This Month</h3>
          </div>
          <p className='text-2xl font-bold text-white'>--</p>
          <p className='text-xs text-gray-400'>Loading...</p>
        </div>

        <div className='bg-gray-700 rounded-lg p-4 border border-purple-500/30'>
          <div className='flex items-center gap-2 mb-2'>
            <svg
              className='w-5 h-5 text-purple-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
              />
            </svg>
            <h3 className='text-sm font-medium text-gray-300'>Retention Rate</h3>
          </div>
          <p className='text-2xl font-bold text-white'>--</p>
          <p className='text-xs text-gray-400'>Loading...</p>
        </div>
      </div>

      {/* Client List Placeholder */}
      <div className='bg-gray-700 rounded-lg p-6'>
        <h3 className='text-lg font-semibold text-white mb-4'>Client List</h3>
        <div className='text-center py-12'>
          <svg
            className='mx-auto h-12 w-12 text-gray-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z'
            />
          </svg>
          <h3 className='mt-4 text-lg font-medium text-white'>Client Management</h3>
          <p className='mt-2 text-gray-400'>
            This feature is being developed. You&apos;ll be able to view and manage all your
            clients, track their progress, and analyze their engagement patterns.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Content Management View Component
// ============================================================================

function ContentManagementView() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold text-white'>Content Management</h2>
        <button className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors'>
          Save Changes
        </button>
      </div>

      {/* Content Editor Placeholder */}
      <div className='bg-gray-700 rounded-lg p-6'>
        <h3 className='text-lg font-semibold text-white mb-4'>Home Page Content</h3>
        <div className='text-center py-12'>
          <svg
            className='mx-auto h-12 w-12 text-gray-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
            />
          </svg>
          <h3 className='mt-4 text-lg font-medium text-white'>Content Editor</h3>
          <p className='mt-2 text-gray-400 max-w-md mx-auto'>
            This feature is coming soon. You&apos;ll be able to edit your profile information, bio,
            credentials, philosophy, and other content displayed to users on the website.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const EnhancedCoachDashboard: React.FC = () => {
  const { account } = useAuth();
  const [activeView, setActiveView] = useState<DashboardView>('overview');

  // Import existing tab components from the original CoachDashboard
  // These would be extracted from the original file
  const renderTabContent = () => {
    switch (activeView) {
      case 'overview':
        return <OverviewView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'clients':
        return <ClientManagementView />;
      case 'content':
        return <ContentManagementView />;
      case 'sessions':
      case 'timeslots':
      case 'bookingtypes':
      case 'customservices':
      case 'discounts':
        // These would use the existing tab components from CoachDashboard.tsx
        return (
          <div className='bg-gray-700 rounded-lg p-6'>
            <div className='text-center py-12'>
              <h3 className='text-lg font-medium text-white mb-2'>
                {SIDEBAR_ITEMS.find(item => item.id === activeView)?.label}
              </h3>
              <p className='text-gray-400'>
                This section uses the existing implementation from the original dashboard.
                Integration with the enhanced layout is in progress.
              </p>
            </div>
          </div>
        );
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className='min-h-screen bg-gray-900 flex'>
      {/* Sidebar */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      {/* Main Content */}
      <div className='flex-1 flex flex-col'>
        {/* Header */}
        <header className='bg-gray-800 border-b border-gray-700 px-6 py-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-2xl font-bold text-white'>
                {SIDEBAR_ITEMS.find(item => item.id === activeView)?.label || 'Dashboard'}
              </h1>
              <p className='text-gray-400 text-sm'>
                {SIDEBAR_ITEMS.find(item => item.id === activeView)?.description}
              </p>
            </div>

            <div className='flex items-center gap-4'>
              <div className='text-right'>
                <p className='text-sm text-gray-300'>Welcome back,</p>
                <p className='font-medium text-white'>{account?.email || 'Coach'}</p>
              </div>

              <div className='w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center'>
                <span className='text-white font-medium text-sm'>
                  {account?.email?.charAt(0).toUpperCase() || 'C'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className='flex-1 p-6 overflow-auto'>{renderTabContent()}</main>
      </div>
    </div>
  );
};

export default EnhancedCoachDashboard;
