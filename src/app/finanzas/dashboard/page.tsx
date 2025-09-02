'use client'

import { motion } from 'framer-motion';
import DashboardFinanciero from '@/components/finanzas/DashboardFinanciero';

// Metadata moved to layout.tsx since this is now a client component

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function DashboardPage() {
  return (
    <motion.div
      className="flex flex-col gap-6 p-6 md:p-8 lg:p-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <DashboardFinanciero />
      </motion.div>
    </motion.div>
  );
}