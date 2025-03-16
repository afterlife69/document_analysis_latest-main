import React, { createContext, useState, useContext, useMemo, useCallback } from 'react';

const SubjectContext = createContext();

export function SubjectProvider({ children }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  
  // Memoize these functions to prevent unnecessary re-renders
  const updateSubjects = useCallback((newSubjects) => {
    setSubjects(newSubjects);
    setLoading(false);
    setLastFetched(new Date());
  }, []);
  
  const getSubjectById = useCallback((id) => {
    return subjects.find(subject => subject._id === id) || null;
  }, [subjects]);
  
  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    subjects, 
    loading, 
    lastFetched, 
    updateSubjects,
    setLoading,
    getSubjectById 
  }), [subjects, loading, lastFetched, updateSubjects, setLoading, getSubjectById]);

  return (
    <SubjectContext.Provider value={value}>
      {children}
    </SubjectContext.Provider>
  );
}

export function useSubjects() {
  return useContext(SubjectContext);
}
