import { useState, useEffect } from 'react';
import { Plus, X, Code, ChevronDown, ChevronRight } from 'lucide-react';

interface ResponseField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'array_of_objects' | 'null' | 'date' | 'datetime' | 'time' | 'url' | 'email' | 'decimal' | 'multiple_choice';
  description?: string;
  decimalPlaces?: number;
  choices?: string[];
  children?: ResponseField[];
  expanded?: boolean;
}

interface ResponseBuilderProps {
  value: string;
  onChange: (value: string) => void;
  metadata?: any;
  onMetadataChange?: (metadata: any) => void;
}

export function ResponseBuilder({ value, onChange, metadata, onMetadataChange }: ResponseBuilderProps) {
  const [showJsonViewer, setShowJsonViewer] = useState(false);
  const [fields, setFields] = useState<ResponseField[]>([]);
  const [lastParsedValue, setLastParsedValue] = useState<string>('');

  const getExampleValue = (field: ResponseField): any => {
    switch (field.type) {
      case 'string':
        return 'example string';
      case 'number':
        return 0;
      case 'boolean':
        return true;
      case 'array':
        return [];
      case 'array_of_objects':
        if (field.children && field.children.length > 0) {
          const obj: any = {};
          field.children.forEach(child => {
            obj[child.name] = getExampleValue(child);
          });
          return [obj];
        }
        return [{ id: 1, name: 'example' }];
      case 'object':
        return {};
      case 'null':
        return null;
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'datetime':
        return new Date().toISOString();
      case 'time':
        return new Date().toTimeString().split(' ')[0];
      case 'url':
        return 'https://example.com';
      case 'email':
        return 'user@example.com';
      case 'decimal':
        const decimals = field.decimalPlaces ?? 2;
        return parseFloat((123.456).toFixed(decimals));
      case 'multiple_choice':
        return field.choices && field.choices.length > 0 ? field.choices[0] : 'option1';
      default:
        return '';
    }
  };

  const parseJsonToFields = (json: string, metadataObj?: any) => {
    try {
      const parsed = JSON.parse(json);
      const extractedFields: ResponseField[] = [];

      const resultsObj = parsed;
      const metadataFields = metadataObj?.fields || {};

      const extractFields = (obj: any, prefix = '') => {
        Object.entries(obj).forEach(([key, val]) => {
          const fieldName = prefix ? `${prefix}.${key}` : key;
          let type: ResponseField['type'];
          let children: ResponseField[] | undefined;
          const fieldMeta = metadataFields[fieldName] || {};

          if (val === null) {
            type = 'null';
          } else if (Array.isArray(val)) {
            if (val.length > 0 && typeof val[0] === 'object' && val[0] !== null && !Array.isArray(val[0])) {
              type = 'array_of_objects';
              children = [];
              Object.entries(val[0]).forEach(([childKey, childVal]) => {
                let childType: ResponseField['type'];
                const childMeta = metadataFields[`${fieldName}[].${childKey}`] || {};

                // Restore type from metadata first (if available)
                if (childMeta.type) {
                  childType = childMeta.type;
                } else if (childVal === null) {
                  childType = 'null';
                } else if (Array.isArray(childVal)) {
                  childType = 'array';
                } else {
                  childType = typeof childVal as any;
                }
                children!.push({
                  name: childKey,
                  type: childType,
                  description: childMeta.description || '',
                  decimalPlaces: childMeta.decimalPlaces,
                  choices: childMeta.choices,
                });
              });
            } else {
              type = 'array';
            }
          } else {
            // Restore type from metadata first (if available)
            if (fieldMeta.type) {
              type = fieldMeta.type;
            } else {
              type = typeof val as any;
            }
          }

          if (type === 'object' && !Array.isArray(val) && val !== null) {
            extractFields(val, fieldName);
          } else {
            extractedFields.push({
              name: fieldName,
              type: type,
              children: children,
              expanded: type === 'array_of_objects' ? true : undefined,
              description: fieldMeta.description || '',
              decimalPlaces: fieldMeta.decimalPlaces,
              choices: fieldMeta.choices,
            });
          }
        });
      };

      extractFields(resultsObj);
      setFields(extractedFields);
      setLastParsedValue(json);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
    }
  };

  const buildJsonFromFields = () => {
    try {
      const results: any = {};
      const metadata: any = { fields: {} };

      // Filter out fields with empty names
      const validFields = fields.filter(f => f.name && f.name.trim() !== '');

      validFields.forEach((field) => {
        const keys = field.name.split('.');
        let current = results;

        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }

        const lastKey = keys[keys.length - 1];
        current[lastKey] = getExampleValue(field);

        // Store metadata (type, description, decimalPlaces, choices)
        // Always store type for special types that would be lost in JSON serialization
        const specialTypes = ['date', 'datetime', 'time', 'url', 'email', 'decimal', 'multiple_choice'];
        const needsMetadata = field.description || field.decimalPlaces !== undefined || field.choices || specialTypes.includes(field.type);

        if (needsMetadata) {
          metadata.fields[field.name] = {
            type: field.type,
            description: field.description,
            decimalPlaces: field.decimalPlaces,
            choices: field.choices,
          };
        }

        // Store metadata for array children
        if (field.type === 'array_of_objects' && field.children) {
          field.children.forEach((child) => {
            const childNeedsMetadata = child.description || child.decimalPlaces !== undefined || child.choices || specialTypes.includes(child.type);
            if (child.name && child.name.trim() !== '' && childNeedsMetadata) {
              metadata.fields[`${field.name}[].${child.name}`] = {
                type: child.type,
                description: child.description,
                decimalPlaces: child.decimalPlaces,
                choices: child.choices,
              };
            }
          });
        }
      });

      onChange(JSON.stringify(results, null, 2));

      if (onMetadataChange) {
        onMetadataChange(Object.keys(metadata.fields).length > 0 ? metadata : undefined);
      }
    } catch (error) {
      console.error('Failed to build JSON:', error);
    }
  };

  const addField = () => {
    const updated = [...fields, { name: '', type: 'string', description: '' }];
    setFields(updated);
    if (updated.length === 1 && updated[0].name === '') {
      buildJsonFromFields();
    }
  };

  const removeField = (index: number) => {
    const updated = fields.filter((_, i) => i !== index);
    setFields(updated);
  };

  const updateField = (index: number, field: Partial<ResponseField>) => {
    const updated = [...fields];
    const currentField = updated[index];

    if (field.type === 'array_of_objects' && currentField.type !== 'array_of_objects') {
      updated[index] = { ...currentField, ...field, children: [], expanded: true };
    } else if (field.type !== 'array_of_objects' && currentField.type === 'array_of_objects') {
      const { children, expanded, ...rest } = currentField;
      updated[index] = { ...rest, ...field };
    } else if (field.type === 'decimal' && currentField.type !== 'decimal') {
      updated[index] = { ...currentField, ...field, decimalPlaces: 2 };
    } else if (field.type === 'multiple_choice' && currentField.type !== 'multiple_choice') {
      updated[index] = { ...currentField, ...field, choices: ['option1', 'option2'] };
    } else {
      updated[index] = { ...currentField, ...field };
    }

    setFields(updated);
  };

  const addChildField = (parentIndex: number) => {
    const updated = [...fields];
    if (!updated[parentIndex].children) {
      updated[parentIndex].children = [];
    }
    updated[parentIndex].children!.push({ name: '', type: 'string', description: '' });
    setFields(updated);
  };

  const removeChildField = (parentIndex: number, childIndex: number) => {
    const updated = [...fields];
    updated[parentIndex].children = updated[parentIndex].children!.filter((_, i) => i !== childIndex);
    setFields(updated);
  };

  const updateChildField = (parentIndex: number, childIndex: number, field: Partial<ResponseField>) => {
    const updated = [...fields];
    const currentChild = updated[parentIndex].children![childIndex];

    if (field.type === 'decimal' && currentChild.type !== 'decimal') {
      updated[parentIndex].children![childIndex] = { ...currentChild, ...field, decimalPlaces: 2 };
    } else if (field.type === 'multiple_choice' && currentChild.type !== 'multiple_choice') {
      updated[parentIndex].children![childIndex] = { ...currentChild, ...field, choices: ['option1', 'option2'] };
    } else {
      updated[parentIndex].children![childIndex] = { ...currentChild, ...field };
    }

    setFields(updated);
  };

  const toggleExpanded = (index: number) => {
    const updated = [...fields];
    updated[index].expanded = !updated[index].expanded;
    setFields(updated);
  };

  useEffect(() => {
    if (value && value.trim() && value !== lastParsedValue) {
      parseJsonToFields(value, metadata);
    } else if (!value && fields.length === 0) {
      buildJsonFromFields();
    }
  }, [value, metadata]);

  useEffect(() => {
    if (fields.length > 0) {
      buildJsonFromFields();
    }
  }, [fields]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          Response Body *
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowJsonViewer(!showJsonViewer)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <Code size={16} />
            {showJsonViewer ? 'Hide' : 'Show'} JSON
          </button>
        </div>
      </div>

      {showJsonViewer && (
        <div className="mb-3">
          <div className="relative">
            <textarea
              value={value || JSON.stringify({}, null, 2)}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm resize-none bg-gray-50 text-gray-700"
              rows={10}
            />
            <div className="absolute top-2 right-2 bg-gray-700 text-white text-xs px-2 py-1 rounded">
              Read-only
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            JSON preview of your custom response fields. The API will wrap this in a standard structure with analysis_id, status, and results.
          </p>
        </div>
      )}

      <div>
        <div>
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={addField}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              Add Field
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-gray-500 text-sm">No fields defined. Click "Add Field" to create one.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
              {fields.map((field, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm">
                  <div className="flex gap-3 items-start p-3">
                    {field.type === 'array_of_objects' && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(index)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0 mt-1"
                      >
                        {field.expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-3 items-center">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => updateField(index, { name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="Field name (e.g., data.userId)"
                            required
                          />
                        </div>
                        <div className="w-48">
                          <select
                            value={field.type}
                            onChange={(e) => updateField(index, { type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="object">Object</option>
                            <option value="array">Array</option>
                            <option value="array_of_objects">Array of Objects</option>
                            <option value="null">Null</option>
                            <option value="date">Date</option>
                            <option value="datetime">Date Time</option>
                            <option value="time">Time</option>
                            <option value="url">URL</option>
                            <option value="email">Email</option>
                            <option value="decimal">Decimal</option>
                            <option value="multiple_choice">Multiple Choice</option>
                          </select>
                        </div>
                        <div className="w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                          {JSON.stringify(getExampleValue(field)).substring(0, 20)}...
                        </div>
                        <button
                          type="button"
                          onClick={() => removeField(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={field.description || ''}
                          onChange={(e) => updateField(index, { description: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Field description (optional)"
                        />
                      </div>
                      {field.type === 'decimal' && (
                        <div className="flex gap-2 items-center bg-blue-50 px-3 py-2 rounded-lg">
                          <label className="text-sm font-medium text-gray-700">Decimal Places:</label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={field.decimalPlaces ?? 2}
                            onChange={(e) => updateField(index, { decimalPlaces: parseInt(e.target.value) || 2 })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      )}
                      {field.type === 'multiple_choice' && (
                        <div className="bg-blue-50 px-3 py-2 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Available Choices:</label>
                            <button
                              type="button"
                              onClick={() => {
                                const currentChoices = field.choices || [];
                                updateField(index, { choices: [...currentChoices, ''] });
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                            >
                              <Plus size={14} />
                              Add Choice
                            </button>
                          </div>
                          {(!field.choices || field.choices.length === 0) ? (
                            <div className="text-center py-2 bg-white rounded border border-dashed border-gray-300">
                              <p className="text-gray-500 text-xs">No choices defined</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {field.choices.map((choice, choiceIndex) => (
                                <div key={choiceIndex} className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={choice}
                                    onChange={(e) => {
                                      const newChoices = [...(field.choices || [])];
                                      newChoices[choiceIndex] = e.target.value;
                                      updateField(index, { choices: newChoices });
                                    }}
                                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                                    placeholder={`Choice ${choiceIndex + 1}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newChoices = (field.choices || []).filter((_, i) => i !== choiceIndex);
                                      updateField(index, { choices: newChoices });
                                    }}
                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {field.type === 'array_of_objects' && field.expanded && (
                    <div className="px-3 pb-3 pl-12">
                      <div className="border-l-2 border-blue-200 pl-4 space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-gray-600">Object Fields:</p>
                          <button
                            type="button"
                            onClick={() => addChildField(index)}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
                          >
                            <Plus size={14} />
                            Add Field
                          </button>
                        </div>

                        {(!field.children || field.children.length === 0) ? (
                          <div className="text-center py-4 bg-gray-50 rounded border border-dashed border-gray-300">
                            <p className="text-gray-500 text-xs">No fields defined for this object</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {field.children.map((child, childIndex) => (
                              <div key={childIndex} className="bg-blue-50 p-2 rounded space-y-2">
                                <div className="flex gap-2 items-center">
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      value={child.name}
                                      onChange={(e) => updateChildField(index, childIndex, { name: e.target.value })}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                      placeholder="Field name"
                                      required
                                    />
                                  </div>
                                  <div className="w-40">
                                    <select
                                      value={child.type}
                                      onChange={(e) => updateChildField(index, childIndex, { type: e.target.value as any })}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                    >
                                      <option value="string">String</option>
                                      <option value="number">Number</option>
                                      <option value="boolean">Boolean</option>
                                      <option value="object">Object</option>
                                      <option value="array">Array</option>
                                      <option value="null">Null</option>
                                      <option value="date">Date</option>
                                      <option value="datetime">Date Time</option>
                                      <option value="time">Time</option>
                                      <option value="url">URL</option>
                                      <option value="email">Email</option>
                                      <option value="decimal">Decimal</option>
                                      <option value="multiple_choice">Multiple Choice</option>
                                    </select>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeChildField(index, childIndex)}
                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={child.description || ''}
                                  onChange={(e) => updateChildField(index, childIndex, { description: e.target.value })}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  placeholder="Field description (optional)"
                                />
                                {child.type === 'decimal' && (
                                  <div className="flex gap-2 items-center">
                                    <label className="text-xs font-medium text-gray-700">Decimal Places:</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="10"
                                      value={child.decimalPlaces ?? 2}
                                      onChange={(e) => updateChildField(index, childIndex, { decimalPlaces: parseInt(e.target.value) || 2 })}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                                    />
                                  </div>
                                )}
                                {child.type === 'multiple_choice' && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-xs font-medium text-gray-700">Choices:</label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentChoices = child.choices || [];
                                          updateChildField(index, childIndex, { choices: [...currentChoices, ''] });
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                                      >
                                        <Plus size={12} />
                                        Add
                                      </button>
                                    </div>
                                    {(!child.choices || child.choices.length === 0) ? (
                                      <div className="text-center py-2 bg-white rounded border border-dashed border-gray-300">
                                        <p className="text-gray-500 text-xs">No choices defined</p>
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        {child.choices.map((choice, choiceIndex) => (
                                          <div key={choiceIndex} className="flex gap-1 items-center">
                                            <input
                                              type="text"
                                              value={choice}
                                              onChange={(e) => {
                                                const newChoices = [...(child.choices || [])];
                                                newChoices[choiceIndex] = e.target.value;
                                                updateChildField(index, childIndex, { choices: newChoices });
                                              }}
                                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                              placeholder={`Choice ${choiceIndex + 1}`}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newChoices = (child.choices || []).filter((_, i) => i !== choiceIndex);
                                                updateChildField(index, childIndex, { choices: newChoices });
                                              }}
                                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Configure your custom response fields. Use dot notation for nested fields (e.g., "user.name"). The API will automatically wrap these in a standard response structure.
          </p>
        </div>
      </div>
    </div>
  );
}
