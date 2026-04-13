import { createContext, useContext, useState } from "react";

const defaultSchemaContext = {
  schema: null,
  setSchema: () => {},
  isDark: true,
  setIsDark: () => {},
};

const SchemaContext = createContext(defaultSchemaContext);

export function SchemaProvider({ children }) {
  const [schema, setSchema] = useState(null);
  const [isDark, setIsDark] = useState(true);

  return (
    <SchemaContext.Provider value={{ schema, setSchema, isDark, setIsDark }}>
      {children}
    </SchemaContext.Provider>
  );
}

export function useSchema() {
  return useContext(SchemaContext) || defaultSchemaContext;
}

