'use client';

// components/ui/NoDataState.tsx
// Thin wrapper matching the NoDataState interface used in company live pages.
// Maps `description` → `body` and delegates to EmptyState.

import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

interface NoDataStateProps {
  title:        string;
  description?: string;
  action?:      ReactNode;
  icon?:        ReactNode;
}

export function NoDataState({ title, description, action, icon }: NoDataStateProps) {
  return (
    <EmptyState
      title={title}
      body={description}
      action={action}
      icon={icon}
    />
  );
}
