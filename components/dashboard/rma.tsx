import React, { useCallback } from 'react';

const fetchRMAs = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    let url = `/api/rma?page=${currentPage}&pageSize=${pageSize}`;
    
    // Tilføj søgeterm hvis der er en
    if (searchTerm) {
      url += `&search=${encodeURIComponent(searchTerm)}`;
    }
    
    // Tilføj statusfilter hvis det er valgt
    if (statusFilter) {
      url += `&status=${encodeURIComponent(statusFilter)}`;
    }
    
    // Tilføj sortering
    if (sortBy) {
      url += `&sort=${encodeURIComponent(sortBy)}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Kunne ikke hente RMA-sager');
    }
    const data = await response.json();
    setRmaItems(data.items);
    setTotalPages(data.totalPages);
  } catch (err) {
    setError('Der opstod en fejl ved hentning af RMA-sager');
    console.error('Error fetching RMAs:', err);
  } finally {
    setLoading(false);
  }
}, [currentPage, pageSize, searchTerm, statusFilter, sortBy]); 