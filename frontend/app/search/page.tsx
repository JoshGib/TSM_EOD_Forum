import { Suspense } from 'react';
import SearchResults from './SearchResults';

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20">Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}
