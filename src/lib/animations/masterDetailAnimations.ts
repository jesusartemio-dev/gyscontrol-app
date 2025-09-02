/**
 * 🎬 Master-Detail Animation Configurations
 * 
 * Centralized animation variants for Master-Detail pattern transitions
 * using Framer Motion. Includes page transitions, hover effects, and loading states.
 * 
 * @author TRAE GYS Agent
 * @version 1.0
 */

import { Variants } from 'framer-motion';

// ✅ Page transition variants
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    x: 20,
    scale: 0.98
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94], // Custom easing for smooth feel
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    x: -20,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// ✅ Master to Detail transition variants
export const masterToDetailVariants: Variants = {
  initial: {
    opacity: 0,
    x: 50,
    scale: 0.95
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1], // Smooth spring-like easing
      staggerChildren: 0.15
    }
  },
  exit: {
    opacity: 0,
    x: -50,
    scale: 0.95,
    transition: {
      duration: 0.4,
      ease: [0.7, 0, 0.84, 0]
    }
  }
};

// ✅ Detail to Master transition variants
export const detailToMasterVariants: Variants = {
  initial: {
    opacity: 0,
    x: -50,
    scale: 0.95
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    x: 50,
    scale: 0.95,
    transition: {
      duration: 0.4,
      ease: [0.7, 0, 0.84, 0]
    }
  }
};

// ✅ Card hover animation variants
export const cardHoverVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  },
  hover: {
    scale: 1.02,
    y: -4,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  tap: {
    scale: 0.98,
    y: 0,
    transition: {
      duration: 0.1,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// ✅ Button interaction variants
export const buttonInteractionVariants: Variants = {
  initial: {
    scale: 1,
    backgroundColor: 'var(--primary)'
  },
  hover: {
    scale: 1.05,
    backgroundColor: 'var(--primary-hover)',
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// ✅ Loading state variants
export const loadingVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// ✅ Skeleton loading pulse variants
export const skeletonPulseVariants: Variants = {
  initial: {
    opacity: 0.6
  },
  animate: {
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 1.5,
      ease: [0.4, 0, 0.6, 1] as const,
      repeat: Infinity
    }
  }
};

// ✅ Stagger container variants
export const staggerContainerVariants: Variants = {
  initial: {
    opacity: 0
  },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

// ✅ Stagger item variants
export const staggerItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// ✅ Breadcrumb navigation variants
export const breadcrumbVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// ✅ Modal/Dialog variants
export const modalVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
    y: 20
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.2,
      ease: [0.7, 0, 0.84, 0]
    }
  }
};

// ✅ Backdrop variants
export const backdropVariants: Variants = {
  initial: {
    opacity: 0
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: [0, 0, 0.2, 1] as const
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1] as const
    }
  }
};

// ✅ Success/Error state variants
export const statusVariants: Variants = {
  success: {
    scale: [1, 1.1, 1],
    backgroundColor: ['var(--success)', 'var(--success-light)', 'var(--success)'],
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  error: {
    x: [0, -10, 10, -10, 10, 0],
    backgroundColor: ['var(--destructive)', 'var(--destructive-light)', 'var(--destructive)'],
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// ✅ Utility function to get transition config based on direction
export const getTransitionVariants = (direction: 'master-to-detail' | 'detail-to-master' | 'default') => {
  switch (direction) {
    case 'master-to-detail':
      return masterToDetailVariants;
    case 'detail-to-master':
      return detailToMasterVariants;
    default:
      return pageTransitionVariants;
  }
};

// ✅ Animation configuration constants
export const ANIMATION_CONFIG = {
  // Duration constants
  FAST: 0.2,
  NORMAL: 0.3,
  SLOW: 0.5,
  
  // Easing presets
  EASE_OUT: [0.25, 0.46, 0.45, 0.94] as const,
  EASE_SPRING: [0.16, 1, 0.3, 1] as const,
  EASE_SHARP: [0.7, 0, 0.84, 0] as const,
  
  // Stagger delays
  STAGGER_FAST: 0.05,
  STAGGER_NORMAL: 0.1,
  STAGGER_SLOW: 0.15
} as const;