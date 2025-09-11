/**
 * 🎯 DetailViewSkeletons - Componentes de loading para vistas detalle
 * 
 * Proporciona skeletons optimizados para vistas de detalle del patrón
 * Master-Detail, mejorando la percepción de performance.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// 🎨 Animaciones para skeletons
const pulseVariants = {
  initial: { opacity: 0.6 },
  animate: { 
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: [0.4, 0, 0.6, 1] as const
    }
  }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// 📱 Props interfaces
interface DetailViewSkeletonProps {
  className?: string;
}

interface DetailHeaderSkeletonProps {
  className?: string;
}

interface DetailContentSkeletonProps {
  sections?: number;
  className?: string;
}

interface DetailTabsSkeletonProps {
  tabCount?: number;
  className?: string;
}

/**
 * 📋 Skeleton para breadcrumb de detalle
 */
const DetailBreadcrumbSkeleton: React.FC<{ className?: string }> = ({
  className
}) => {
  return (
    <motion.div
      className={cn("flex items-center space-x-2 mb-6", className)}
      variants={pulseVariants}
      initial="initial"
      animate="animate"
    >
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-32" />
    </motion.div>
  );
};

/**
 * 🎯 Skeleton para header de detalle
 */
const DetailHeaderSkeleton: React.FC<DetailHeaderSkeletonProps> = ({
  className
}) => {
  return (
    <motion.div
      className={className}
      variants={pulseVariants}
      initial="initial"
      animate="animate"
    >
      <Card className="border-0 shadow-sm bg-gradient-to-r from-gray-50 to-gray-100">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div className="space-y-2">
                <Skeleton className="h-8 w-80" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * 📊 Skeleton para tabs de detalle
 */
const DetailTabsSkeleton: React.FC<DetailTabsSkeletonProps> = ({
  tabCount = 4,
  className
}) => {
  return (
    <motion.div
      className={cn("space-y-4", className)}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Tab headers */}
      <motion.div variants={pulseVariants}>
        <div className="flex items-center gap-4 border-b">
          {Array.from({ length: tabCount }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-32" />
          ))}
        </div>
      </motion.div>
      
      {/* Tab content */}
      <motion.div variants={pulseVariants}>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

/**
 * 📄 Skeleton para contenido de detalle
 */
const DetailContentSkeleton: React.FC<DetailContentSkeletonProps> = ({
  sections = 3,
  className
}) => {
  return (
    <motion.div
      className={cn("space-y-6", className)}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {Array.from({ length: sections }).map((_, index) => (
        <motion.div key={index} variants={pulseVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-8 w-24" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-full" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
              
              {/* Additional content rows */}
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, rowIndex) => (
                  <div key={rowIndex} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

/**
 * 🎯 Skeleton principal para DetailView
 */
const DetailViewSkeleton: React.FC<DetailViewSkeletonProps> = ({
  className
}) => {
  return (
    <motion.div
      className={cn("space-y-6", className)}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Breadcrumb */}
      <DetailBreadcrumbSkeleton />
      
      {/* Header */}
      <DetailHeaderSkeleton />
      
      {/* Tabs */}
      <DetailTabsSkeleton />
    </motion.div>
  );
};

/**
 * 📋 Skeleton para lista de items en detalle
 */
const DetailItemListSkeleton: React.FC<{
  itemCount?: number;
  className?: string;
}> = ({
  itemCount = 5,
  className
}) => {
  return (
    <motion.div
      className={cn("space-y-4", className)}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {Array.from({ length: itemCount }).map((_, index) => (
        <motion.div key={index} variants={pulseVariants}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

// 📤 Exports
export default DetailViewSkeleton;
export {
  DetailBreadcrumbSkeleton,
  DetailHeaderSkeleton,
  DetailTabsSkeleton,
  DetailContentSkeleton,
  DetailItemListSkeleton,
};
export type {
  DetailViewSkeletonProps,
  DetailHeaderSkeletonProps,
  DetailContentSkeletonProps,
  DetailTabsSkeletonProps,
};
