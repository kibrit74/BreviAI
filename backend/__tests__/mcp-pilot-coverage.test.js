const fs = require('fs');
const path = require('path');

function read(relPath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf-8');
}

describe('MCP pilot coverage', () => {
  test('registry contains read-only pilot tools', () => {
    const source = read('src/lib/mcp/registry.ts');
    expect(source.includes('breviai.web_search')).toBe(true);
    expect(source.includes('breviai.list_templates')).toBe(true);
    expect(source.includes('readOnly: true')).toBe(true);
    expect(source.includes('MCP_WEB_SEARCH_TIMEOUT_MS')).toBe(true);
    expect(source.includes('withTimeout(')).toBe(true);
  });

  test('registry contains Google MCP tools', () => {
    const source = read('src/lib/mcp/registry.ts');
    expect(source.includes('breviai.google.sheets_read')).toBe(true);
    expect(source.includes('breviai.google.sheets_write')).toBe(true);
    expect(source.includes('breviai.google.gmail_read')).toBe(true);
    expect(source.includes('breviai.google.drive_list')).toBe(true);
    expect(source.includes('breviai.google.calendar_list')).toBe(true);
    expect(source.includes('breviai.google.calendar_create')).toBe(true);
    expect(source.includes('breviai.google.meet_create')).toBe(true);
    expect(source.includes('sheets.googleapis.com')).toBe(true);
    expect(source.includes('gmail.googleapis.com')).toBe(true);
    expect(source.includes('googleapis.com/drive/v3/files')).toBe(true);
    expect(source.includes('googleapis.com/calendar/v3')).toBe(true);
    expect(source.includes('conferenceDataVersion=1')).toBe(true);
  });

  test('MCP API route supports list and call actions', () => {
    const source = read('src/app/api/mcp/route.ts');
    expect(source.includes("action: z.literal('list_tools')")).toBe(true);
    expect(source.includes("action: z.literal('call_tool')")).toBe(true);
    expect(source.includes('verifyAppSecretAuth')).toBe(true);
  });

  test('registry contains Microsoft MCP tools', () => {
    const source = read('src/lib/mcp/registry.ts');
    expect(source.includes('breviai.microsoft.outlook_read')).toBe(true);
    expect(source.includes('breviai.microsoft.outlook_send')).toBe(true);
    expect(source.includes('breviai.microsoft.onedrive_list')).toBe(true);
    expect(source.includes('breviai.microsoft.onedrive_search')).toBe(true);
    expect(source.includes('breviai.microsoft.teams_meeting')).toBe(true);
    expect(source.includes('breviai.microsoft.calendar_list')).toBe(true);
    expect(source.includes('breviai.microsoft.calendar_create')).toBe(true);
    expect(source.includes('breviai.microsoft.excel_read')).toBe(true);
    expect(source.includes('breviai.microsoft.excel_write')).toBe(true);
    expect(source.includes('graph.microsoft.com')).toBe(true);
    expect(source.includes('calendarView')).toBe(true);
    expect(source.includes('/workbook/worksheets/')).toBe(true);
  });

  test('registry contains GitHub MCP tools', () => {
    const source = read('src/lib/mcp/registry.ts');
    expect(source.includes('breviai.github.repos_list')).toBe(true);
    expect(source.includes('api.github.com')).toBe(true);
  });

  test('registry contains business productivity MCP tools', () => {
    const source = read('src/lib/mcp/registry.ts');
    // Notion
    expect(source.includes('breviai.notion.search')).toBe(true);
    expect(source.includes('breviai.notion.create_page')).toBe(true);
    expect(source.includes('api.notion.com')).toBe(true);
    // Slack
    expect(source.includes('breviai.slack.send_message')).toBe(true);
    expect(source.includes('breviai.slack.list_channels')).toBe(true);
    expect(source.includes('slack.com/api')).toBe(true);
    // Trello
    expect(source.includes('breviai.trello.list_cards')).toBe(true);
    expect(source.includes('breviai.trello.create_card')).toBe(true);
    expect(source.includes('api.trello.com')).toBe(true);
    // Jira
    expect(source.includes('breviai.jira.search_issues')).toBe(true);
    expect(source.includes('breviai.jira.create_issue')).toBe(true);
    // Asana
    expect(source.includes('breviai.asana.list_tasks')).toBe(true);
    expect(source.includes('breviai.asana.create_task')).toBe(true);
    expect(source.includes('app.asana.com')).toBe(true);
    // Airtable
    expect(source.includes('breviai.airtable.list_records')).toBe(true);
    expect(source.includes('api.airtable.com')).toBe(true);
    // Zapier
    expect(source.includes('breviai.zapier.trigger_webhook')).toBe(true);
    expect(source.includes('hooks.zapier.com')).toBe(true);
  });
});
