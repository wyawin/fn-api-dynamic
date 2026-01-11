interface FieldMetadata {
    type?: string;
    description?: string;
    decimalPlaces?: number;
    choices?: string[];
    example?: any;
  }
  
  interface ResponseMetadata {
    fields: Record<string, FieldMetadata>;
  }
  
  const generateDummyValue = (fieldPath: string, metadata?: FieldMetadata, schemaValue?: any): any => {
    if (metadata?.example !== undefined && metadata.example !== null && metadata.example !== '') {
      return metadata.example;
    }
  
    if (schemaValue !== undefined && schemaValue !== null) {
      if (typeof schemaValue === 'string') {
        return metadata?.choices?.[0] || schemaValue || 'Sample Value';
      }
      if (typeof schemaValue === 'number') {
        return schemaValue;
      }
      if (typeof schemaValue === 'boolean') {
        return schemaValue;
      }
      if (Array.isArray(schemaValue)) {
        return schemaValue;
      }
      if (typeof schemaValue === 'object') {
        return schemaValue;
      }
    }
  
    if (metadata?.choices && metadata.choices.length > 0) {
      return metadata.choices[0];
    }
  
    const type = metadata?.type?.toLowerCase();
  
    switch (type) {
      case 'string':
        return 'Sample Value';
      case 'number':
        return metadata?.decimalPlaces !== undefined ? parseFloat((123.45).toFixed(metadata.decimalPlaces)) : 123;
      case 'boolean':
        return true;
      case 'array':
        return [];
      case 'object':
        return {};
      case 'null':
        return null;
      default:
        return 'Sample Value';
    }
  };
  
  const generateDummyResponseFromSchema = (
    schema: any,
    metadata?: Record<string, FieldMetadata>,
    prefix = ''
  ): any => {
    if (schema === null || schema === undefined) {
      return null;
    }
  
    if (Array.isArray(schema)) {
      if (schema.length === 0) {
        return [];
      }
  
      const firstItem = schema[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        const dummyItem = generateDummyResponseFromSchema(firstItem, metadata, `${prefix}[]`);
        return [dummyItem];
      }
  
      return schema;
    }
  
    if (typeof schema === 'object') {
      const result: any = {};
  
      Object.entries(schema).forEach(([key, value]) => {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        const fieldMetadata = metadata?.[fieldPath];
  
        if (value === null || value === undefined) {
          result[key] = generateDummyValue(fieldPath, fieldMetadata, value);
        } else if (Array.isArray(value)) {
          if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
            const arrayItemPath = `${fieldPath}[]`;
            const dummyItem: any = {};
  
            Object.entries(value[0]).forEach(([childKey, childValue]) => {
              const childPath = `${arrayItemPath}.${childKey}`;
              const childMetadata = metadata?.[childPath];
              dummyItem[childKey] = generateDummyValue(childPath, childMetadata, childValue);
            });
  
            result[key] = [dummyItem];
          } else {
            result[key] = generateDummyValue(fieldPath, fieldMetadata, value);
          }
        } else if (typeof value === 'object') {
          result[key] = generateDummyResponseFromSchema(value, metadata, fieldPath);
        } else {
          result[key] = generateDummyValue(fieldPath, fieldMetadata, value);
        }
      });
  
      return result;
    }
  
    return schema;
  };
  
  export const generateDummyResponse = (
    expectedSchema: any,
    metadata?: ResponseMetadata
  ): any => {
    return generateDummyResponseFromSchema(expectedSchema, metadata?.fields);
  };
  