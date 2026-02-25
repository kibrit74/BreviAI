const fs = require('fs');
const p = 'expo/src/services/WorkflowEngine.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/executeAudioRecord,/, 'executeAudioRecord,\n    executeFindCallRecording,');
c = c.replace(/from '\.\/nodes\/audio';/, "from './nodes/audio';\nimport { executeFindCallRecording } from './nodes/find_call_recording';");
c = c.replace(/case 'AUDIO_RECORD':\s+output = await executeAudioRecord\(node\.config as any, this\.variableManager\);\s+break;/, `case 'AUDIO_RECORD':
                    output = await executeAudioRecord(node.config as any, this.variableManager);
                    break;
                case 'FIND_CALL_RECORDING':
                    output = await executeFindCallRecording(node.config as any, this.variableManager);
                    break;`);

fs.writeFileSync(p, c);
console.log('Done modifying WorkflowEngine.ts');
