import * as Contacts from 'expo-contacts';
import {
    WorkflowNode,
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
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<NodeExecutionResult['output']> => {
    const config = node.config as ContactsReadConfig;
    const query = variableManager.resolveString(config.query || '');

    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('Contacts permission not granted');
    }

    let contacts: Contacts.Contact[] = [];

    if (config.fetchAll) {
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

    if (config.variableName) {
        variableManager.set(config.variableName, result);
    }

    return { [config.variableName || 'contacts']: result };
};

/**
 * Execute Contacts Write Node
 * Creates a new contact.
 */
export const executeContactsWrite = async (
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<NodeExecutionResult['output']> => {
    const config = (node.config || {}) as ContactsWriteConfig;

    if (!config.firstName) {
        throw new Error('İsim (firstName) alanı zorunludur');
    }

    const firstName = variableManager.resolveString(config.firstName);
    const lastName = variableManager.resolveString(config.lastName || '');
    const phoneNumber = variableManager.resolveString(config.phoneNumber || '');
    const email = variableManager.resolveString(config.email || '');
    const company = variableManager.resolveString(config.company || '');

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

    if (config.variableName) {
        variableManager.set(config.variableName, contactId);
    }

    return { success: true, contactId };
};
