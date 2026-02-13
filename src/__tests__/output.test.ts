import { describe, it, expect } from 'vitest';
import { formatOutput } from '../lib/output.js';

describe('formatOutput', () => {
  const sampleData = [
    { name: 'My Container', container_id: '123', type: 'web' },
    { name: 'My App', container_id: '456', type: 'android' },
  ];

  it('formats data as JSON', () => {
    const result = formatOutput(sampleData, 'json');
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(sampleData);
  });

  it('formats single object as JSON', () => {
    const single = { name: 'My Container', container_id: '123' };
    const result = formatOutput(single, 'json');
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(single);
  });

  it('formats data as CSV', () => {
    const result = formatOutput(sampleData, 'csv');
    expect(result).toContain('name');
    expect(result).toContain('My Container');
    expect(result).toContain('My App');
  });

  it('formats data as table', () => {
    const result = formatOutput(sampleData, 'table');
    expect(result).toContain('My Container');
    expect(result).toContain('My App');
    expect(result).toContain('123');
  });

  it('handles empty array', () => {
    const result = formatOutput([], 'table');
    expect(result).toBe('No data');
  });

  it('handles empty array for CSV', () => {
    const result = formatOutput([], 'csv');
    expect(result).toBe('');
  });
});
