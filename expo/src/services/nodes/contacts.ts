import * as Contacts from 'expo-contacts';
import {
    NodeExecutionResult,
    ContactsReadConfig,
    ContactsWriteConfig
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';

/**
 * Execute Contacts Read Node
 * Searches for contacts by name or fetches all.
 */
export const executeContactsRead = async (
    config: ContactsReadConfig,
    variableManager: VariableManager
): Promise<NodeExecutionResult['output']> => {
    const safeConfig = (config || {}) as ContactsReadConfig;
    // Beginner-friendly fallback: if query is omitted, search with previous node output.
    const queryTemplate = safeConfig.query && safeConfig.query.trim().length > 0
        ? safeConfig.query
        : '{{previous_output}}';
    const query = variableManager.resolveString(queryTemplate);

    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('Contacts permission not granted');
    }

    let contacts: Contacts.Contact[] = [];

    if (safeConfig.fetchAll) {
        const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        });
        contacts = data;
    } else if (query) {
        const { data } = await Contacts.getContactsAsync({
            name: query,
            fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        });
        contacts = data;
    }

    // Transform to simpler object if needed, or keep as is
    // Let's return array of simple objects for easier consumption
    const result = contacts.map(c => ({
        id: (c as any).id,
        name: c.name,
        firstName: c.firstName,
        lastName: c.lastName,
        phoneNumbers: c.phoneNumbers?.map(p => p.number) || [],
        emails: c.emails?.map(e => e.email) || [],
    }));

    if (safeConfig.variableName) {
        variableManager.set(safeConfig.variableName, result);
    }

    return { [safeConfig.variableName || 'contacts']: result };
};

/**
 * Execute Contacts Write Node
 * Creates a new contact.
 */
export const executeContactsWrite = async (
    config: ContactsWriteConfig,
    variableManager: VariableManager
): Promise<NodeExecutionResult['output']> => {
    const safeConfig = (config || {}) as ContactsWriteConfig;

    if (!safeConfig.firstName) {
        throw new Error('İsim (firstName) alanı zorunludur');
    }

    const firstName = variableManager.resolveString(safeConfig.firstName);
    const lastName = variableManager.resolveString(safeConfig.lastName || '');
    const phoneNumber = variableManager.resolveString(safeConfig.phoneNumber || '');
    const email = variableManager.resolveString(safeConfig.email || '');
    const company = variableManager.resolveString(safeConfig.company || '');

    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('Contacts permission not granted');
    }

    const contact: any = {
        [Contacts.Fields.FirstName]: firstName,
        [Contacts.Fields.LastName]: lastName,
        [Contacts.Fields.ContactType]: Contacts.ContactTypes.Person,
        [Contacts.Fields.PhoneNumbers]: phoneNumber ? [{
            label: 'mobile',
            number: phoneNumber,
            isPrimary: true,
        }] : undefined,
        [Contacts.Fields.Emails]: email ? [{
            label: 'home',
            email: email,
            isPrimary: true
        }] : undefined,
        [Contacts.Fields.Company]: company,
        [Contacts.Fields.Name]: `${firstName} ${lastName}`.trim()
    };

    const contactId = await Contacts.addContactAsync(contact);

    if (safeConfig.variableName) {
        variableManager.set(safeConfig.variableName, contactId);
    }

    return { success: true, contactId };
};
