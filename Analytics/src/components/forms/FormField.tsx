import React from 'react';
import { FormFieldProps } from '../../types';

const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  maxLength,
  rows = 3,
  required = false,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const renderInput = () => {
    if (type === 'textarea') {
      return (
        <textarea
          id={id}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          rows={rows}
          required={required}
          className="form-input"
        />
      );
    }

    return (
      <input
        id={id}
        type={type}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        className="form-input"
      />
    );
  };

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {renderInput()}
    </div>
  );
};

export default FormField;