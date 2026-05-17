'use client';

import { Suspense } from 'react';
import { Forum } from '../components/Forum';

export default function ForumPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-sm text-gray-500">Loading forum...</div>}>
      <Forum />
    </Suspense>
  );
}
