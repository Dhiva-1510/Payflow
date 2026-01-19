import React from 'react';

/**
 * LoadingSkeleton Component
 * Provides sophisticated loading skeleton components for different UI elements
 * Requirements: 5.5 - Loading states while data is being fetched
 */

/**
 * Base skeleton component with shimmer effect
 */
const SkeletonBase = ({ className = '', children, ...props }) => (
  <div 
    className={`animate-pulse bg-gradient-to-r from-[#F8F8F8]/5 via-[#F8F8F8]/10 to-[#F8F8F8]/5 bg-[length:200%_100%] animate-shimmer rounded ${className}`}
    {...props}
  >
    {children}
  </div>
);

/**
 * Card skeleton for dashboard metric cards
 */
export const CardSkeleton = ({ className = '' }) => (
  <div className={`card p-6 ${className}`}>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <SkeletonBase className="w-8 h-8 rounded-lg" />
          <SkeletonBase className="h-4 w-24 rounded" />
        </div>
        <SkeletonBase className="h-4 w-16 rounded" />
      </div>
      
      {/* Main content */}
      <div className="text-center py-4">
        <SkeletonBase className="h-8 w-32 rounded mx-auto mb-2" />
        <SkeletonBase className="h-4 w-28 rounded mx-auto" />
      </div>
      
      {/* Footer */}
      <div className="pt-3 border-t border-[#FFFFFF]/[0.08]">
        <div className="flex items-center justify-between">
          <SkeletonBase className="h-3 w-16 rounded" />
          <div className="flex items-center space-x-2">
            <SkeletonBase className="w-2 h-2 rounded-full" />
            <SkeletonBase className="h-3 w-12 rounded" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Grid skeleton for metrics grid
 */
export const MetricsGridSkeleton = ({ cardCount = 3, className = '' }) => (
  <div className={`metrics-grid ${className}`}>
    {Array.from({ length: cardCount }, (_, index) => (
      <CardSkeleton key={index} />
    ))}
  </div>
);

/**
 * List item skeleton
 */
export const ListItemSkeleton = ({ className = '' }) => (
  <div className={`p-4 border-b border-[#FFFFFF]/[0.08] ${className}`}>
    <div className="flex items-center space-x-4">
      <SkeletonBase className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonBase className="h-4 w-3/4 rounded" />
        <SkeletonBase className="h-3 w-1/2 rounded" />
      </div>
      <SkeletonBase className="h-8 w-20 rounded" />
    </div>
  </div>
);

/**
 * Table skeleton
 */
export const TableSkeleton = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`overflow-hidden ${className}`}>
    {/* Header */}
    <div className="border-b border-[#FFFFFF]/[0.08] p-4">
      <div className="flex space-x-4">
        {Array.from({ length: columns }, (_, index) => (
          <SkeletonBase key={index} className="h-4 flex-1 rounded" />
        ))}
      </div>
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={rowIndex} className="border-b border-[#FFFFFF]/[0.08] p-4">
        <div className="flex space-x-4">
          {Array.from({ length: columns }, (_, colIndex) => (
            <SkeletonBase key={colIndex} className="h-4 flex-1 rounded" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

/**
 * Form skeleton
 */
export const FormSkeleton = ({ fields = 4, className = '' }) => (
  <div className={`space-y-6 ${className}`}>
    {Array.from({ length: fields }, (_, index) => (
      <div key={index} className="space-y-2">
        <SkeletonBase className="h-4 w-24 rounded" />
        <SkeletonBase className="h-10 w-full rounded-lg" />
      </div>
    ))}
    <div className="flex space-x-4 pt-4">
      <SkeletonBase className="h-10 w-24 rounded-lg" />
      <SkeletonBase className="h-10 w-20 rounded-lg" />
    </div>
  </div>
);

/**
 * Text skeleton for paragraphs
 */
export const TextSkeleton = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }, (_, index) => (
      <SkeletonBase 
        key={index} 
        className={`h-4 rounded ${
          index === lines - 1 ? 'w-3/4' : 'w-full'
        }`} 
      />
    ))}
  </div>
);

/**
 * Button skeleton
 */
export const ButtonSkeleton = ({ className = '' }) => (
  <SkeletonBase className={`h-10 w-24 rounded-lg ${className}`} />
);

/**
 * Avatar skeleton
 */
export const AvatarSkeleton = ({ size = 'md', className = '' }) => {
  const sizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };
  
  return (
    <SkeletonBase className={`${sizes[size]} rounded-full ${className}`} />
  );
};

/**
 * Chart skeleton
 */
export const ChartSkeleton = ({ className = '' }) => (
  <div className={`p-6 ${className}`}>
    <div className="space-y-4">
      {/* Chart title */}
      <SkeletonBase className="h-6 w-48 rounded" />
      
      {/* Chart area */}
      <div className="h-64 relative">
        <SkeletonBase className="absolute inset-0 rounded-lg" />
        
        {/* Simulated chart bars */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end space-x-2">
          {Array.from({ length: 7 }, (_, index) => (
            <SkeletonBase 
              key={index} 
              className="flex-1 rounded-t"
              style={{ height: `${Math.random() * 60 + 20}%` }}
            />
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex space-x-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex items-center space-x-2">
            <SkeletonBase className="w-3 h-3 rounded-full" />
            <SkeletonBase className="h-3 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * Page skeleton for full page loading
 */
export const PageSkeleton = ({ className = '' }) => (
  <div className={`space-y-8 ${className}`}>
    {/* Header */}
    <div className="space-y-4">
      <SkeletonBase className="h-8 w-64 rounded" />
      <SkeletonBase className="h-4 w-96 rounded" />
    </div>
    
    {/* Metrics grid */}
    <MetricsGridSkeleton />
    
    {/* Content sections */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-6">
        <SkeletonBase className="h-6 w-32 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonBase key={index} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
      
      <div className="card p-6">
        <SkeletonBase className="h-6 w-32 rounded mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center justify-between">
              <SkeletonBase className="h-4 w-24 rounded" />
              <SkeletonBase className="h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default SkeletonBase;