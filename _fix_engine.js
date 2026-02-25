const fs = require('fs');
const path = 'expo/src/services/WorkflowEngine.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Update import
const importSearch = "    executeAudioRecord,\r\n    executeSmsSend";
const importReplace = "    executeAudioRecord,\r\n    executeFindCallRecording,\r\n    executeSmsSend";

if (code.includes('executeAudioRecord,')) {
    // If exact match fails, try replacing just before executeSmsSend
    code = code.replace("executeAudioRecord,", "executeAudioRecord,\r\n    executeFindCallRecording,");
}

const importFromSearch = "from './nodes/audio';";
const importFromReplace = "from './nodes/audio';\r\nimport { executeFindCallRecording } from './nodes/find_call_recording';";

if (code.includes(importFromSearch)) {
    code = code.replace(importFromSearch, importFromReplace);
}

// 2. Add switch case
const switchSearch = "                case 'AUDIO_RECORD':\r\n                    output = await executeAudioRecord(node.config as any, this.variableManager);\r\n                    break;";
const switchReplace = "                case 'AUDIO_RECORD':\r\n                    output = await executeAudioRecord(node.config as any, this.variableManager);\r\n                    break;\r\n                case 'FIND_CALL_RECORDING':\r\n                    output = await executeFindCallRecording(node.config as any, this.variableManager);\r\n                    break;";

if (code.includes("case 'AUDIO_RECORD':")) {
    code = code.replace(switchSearch, switchReplace);
}

fs.writeFileSync(path, code);
console.log('WorkflowEngine.ts updated successfully');
