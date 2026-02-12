/**
 * VariableManager Tests
 * Değişken yönetimi testleri
 */

import { VariableManager } from '../../src/services/VariableManager';

describe('VariableManager', () => {
    let vm: VariableManager;

    beforeEach(() => {
        vm = new VariableManager();
    });

    describe('Basic Operations', () => {
        test('should set and get value', () => {
            vm.set('name', 'John');
            expect(vm.get('name')).toBe('John');
        });

        test('should check if variable exists', () => {
            vm.set('exists', true);
            expect(vm.has('exists')).toBe(true);
            expect(vm.has('notExists')).toBe(false);
        });

        test('should delete variable', () => {
            vm.set('toDelete', 'value');
            vm.delete('toDelete');
            expect(vm.has('toDelete')).toBe(false);
        });

        test('should clear all variables', () => {
            vm.set('a', 1);
            vm.set('b', 2);
            vm.clear();
            expect(vm.getAll()).toEqual({});
        });
    });

    describe('Numeric Operations', () => {
        test('should increment value', () => {
            vm.set('counter', 5);
            const result = vm.increment('counter');
            expect(result).toBe(6);
            expect(vm.get('counter')).toBe(6);
        });

        test('should increment by custom amount', () => {
            vm.set('counter', 10);
            const result = vm.increment('counter', 5);
            expect(result).toBe(15);
        });

        test('should increment non-existent variable from 0', () => {
            const result = vm.increment('newCounter');
            expect(result).toBe(1);
        });

        test('should decrement value', () => {
            vm.set('counter', 10);
            const result = vm.decrement('counter');
            expect(result).toBe(9);
        });

        test('should decrement by custom amount', () => {
            vm.set('counter', 20);
            const result = vm.decrement('counter', 5);
            expect(result).toBe(15);
        });
    });

    describe('String Operations', () => {
        test('should append to string', () => {
            vm.set('text', 'Hello');
            const result = vm.append('text', ' World');
            expect(result).toBe('Hello World');
        });

        test('should append to empty string', () => {
            const result = vm.append('newText', 'First');
            expect(result).toBe('First');
        });
    });

    describe('resolveString', () => {
        test('should resolve variable in string', () => {
            vm.set('name', 'Alice');
            const result = vm.resolveString('Hello {{name}}!');
            expect(result).toBe('Hello Alice!');
        });

        test('should resolve multiple variables', () => {
            vm.set('first', 'John');
            vm.set('last', 'Doe');
            const result = vm.resolveString('{{first}} {{last}}');
            expect(result).toBe('John Doe');
        });

        test('should keep unresolved variables', () => {
            const result = vm.resolveString('Hello {{unknown}}');
            expect(result).toBe('Hello {{unknown}}');
        });

        test('should handle null/undefined template', () => {
            expect(vm.resolveString(null as any)).toBe('');
            expect(vm.resolveString(undefined as any)).toBe('');
        });

        test('should stringify objects', () => {
            vm.set('obj', { a: 1, b: 2 });
            const result = vm.resolveString('Data: {{obj}}');
            expect(result).toBe('Data: {"a":1,"b":2}');
        });
    });

    describe('resolveValue', () => {
        test('should resolve {{variable}} reference', () => {
            vm.set('value', 42);
            const result = vm.resolveValue('{{value}}');
            expect(result).toBe(42);
        });

        test('should resolve nested property', () => {
            vm.set('user', { name: 'Bob', age: 30 });
            const result = vm.resolveValue('{{user.name}}');
            expect(result).toBe('Bob');
        });

        test('should resolve deeply nested property', () => {
            vm.set('data', { level1: { level2: { value: 'deep' } } });
            const result = vm.resolveValue('{{data.level1.level2.value}}');
            expect(result).toBe('deep');
        });

        test('should resolve plain variable name', () => {
            vm.set('plainVar', 'plainValue');
            const result = vm.resolveValue('plainVar');
            expect(result).toBe('plainValue');
        });

        test('should resolve plain nested property', () => {
            vm.set('obj', { prop: 'value' });
            const result = vm.resolveValue('obj.prop');
            expect(result).toBe('value');
        });

        test('should return literal if not a variable', () => {
            const result = vm.resolveValue('literal string');
            expect(result).toBe('literal string');
        });

        test('should return number as is', () => {
            const result = vm.resolveValue(123);
            expect(result).toBe(123);
        });
    });

    describe('isVariableRef', () => {
        test('should identify {{var}} as reference', () => {
            expect(vm.isVariableRef('{{name}}')).toBe(true);
        });

        test('should reject partial reference', () => {
            expect(vm.isVariableRef('{{name')).toBe(false);
            expect(vm.isVariableRef('name}}')).toBe(false);
        });

        test('should reject plain string', () => {
            expect(vm.isVariableRef('name')).toBe(false);
        });
    });

    describe('getVariableName', () => {
        test('should extract variable name', () => {
            expect(vm.getVariableName('{{name}}')).toBe('name');
        });

        test('should extract nested path', () => {
            expect(vm.getVariableName('{{user.name}}')).toBe('user.name');
        });

        test('should return null for invalid ref', () => {
            expect(vm.getVariableName('not a ref')).toBe(null);
        });
    });

    describe('getAll', () => {
        test('should return all variables as object', () => {
            vm.set('a', 1);
            vm.set('b', 'two');
            vm.set('c', [1, 2, 3]);

            const all = vm.getAll();
            expect(all).toEqual({ a: 1, b: 'two', c: [1, 2, 3] });
        });
    });
});
