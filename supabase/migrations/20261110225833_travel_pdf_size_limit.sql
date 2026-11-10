-- Support the agency's existing 36 MB brochure without changing other buckets.
update storage.buckets set file_size_limit=52428800 where id='travel-assets';
