/**
 * 🎯 MasterViewSkeletons - Componentes de loading para Master-Detail
 * 
 * Proporciona skeletons optimizados para diferentes vistas del patrón
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
interface MasterListSkeletonProps {
  count?: number;
  viewMode?: 'grid' | 'table';
  className?: string;
}

interface DetailViewSkeletonProps {
  className?: string;
}

interface FilterSkeletonProps {
  className?: string;
}

/**
 * 🔄 Skeleton para lista master en vista grid
 */
export const MasterGridSkeleton: React.FC<MasterListSkeletonProps> = ({
  count = 6,
  className
}) => {
  return (
    <motion.div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
        className
      )}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {Array.from({ length: count }).map((_, index) => (
        <motion.div key={index} variants={pulseVariants}>
          <Card className="h-[200px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

/**
 * 📊 Skeleton para lista master en vista tabla
 */
export const MasterTableSkeleton: React.FC<MasterListSkeletonProps> = ({
  count = 8,
  className
}) => {
  return (
    <div className={cn("border rounded-lg overflow-hidden bg-white", className)}>
      {/* Header */}
      <div className="bg-gray-50 border-b">
        <div className="flex items-center px-4 py-3 space-x-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      
      {/* Rows */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {Array.from({ length: count }).map((_, index) => (
          <motion.div
            key={index}
            variants={pulseVariants}
            className="border-b last:border-b-0"
          >
            <div className="flex items-center px-4 py-3 space-x-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

/**
 * 🔍 Skeleton para filtros y búsqueda
 */
export const FiltersSkeleton: React.FC<FilterSkeletonProps> = ({
  className
}) => {
  return (
    <motion.div
      className={cn("flex flex-col sm:flex-row gap-4 mb-6", className)}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={pulseVariants} className="flex-1">
        <Skeleton className="h-10 w-full" />
      </motion.div>
      <motion.div variants={pulseVariants}>
        <Skeleton className="h-10 w-32" />
      </motion.div>
      <motion.div variants={pulseVariants}>
        <Skeleton className="h-10 w-24" />
      </motion.div>
      <motion.div variants={pulseVariants}>
        <Skeleton className="h-10 w-20" />
      </motion.div>
    </motion.div>
  );
};

/**
 * 📄 Skeleton para vista detalle
 */
export const DetailViewSkeleton: React.FC<DetailViewSkeletonProps> = ({
  className
}) => {
  return (
    <motion.div
      className={cn("space-y-6", className)}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={pulseVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Content sections */}
      {Array.from({ length: 3 }).map((_, index) => (
        <motion.div key={index} variants={pulseVariants}>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
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
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

/**
 * 🎯 Skeleton principal para MasterView
 */
export const MasterViewSkeleton: React.FC<{
  viewMode?: 'grid' | 'table';
  showFilters?: boolean;
  itemCount?: number;
  className?: string;
}> = ({
  viewMode = 'grid',
  showFilters = true,
  itemCount = 6,
  className
}) => {
  return (
    <div className={cn("space-y-6", className)}>
      {showFilters && <FiltersSkeleton />}
      
      {viewMode === 'grid' ? (
        <MasterGridSkeleton count={itemCount} />
      ) : (
        <MasterTableSkeleton count={itemCount} />
      )}
    </div>
  );
};

// 📤 Exports
export default MasterViewSkeleton;
export type {
  MasterListSkeletonProps,
  DetailViewSkeletonProps,
  FilterSkeletonProps
};