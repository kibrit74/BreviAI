{
  "nodes": [
    {
      "parameters": {
        "authentication": "oAuth2",
        "operation": "download"
      },
      "type": "n8n-nodes-base.dropbox",
      "typeVersion": 1,
      "position": [
        208,
        0
      ],
      "id": "a62703cf-2307-4024-b390-cea3f1cd9e7f",
      "name": "Download a file",
      "credentials": {
        "dropboxOAuth2Api": {
          "id": "L04mlytr1PD3ElqV",
          "name": "Dropbox account"
        }
      }
    }
  ],
  "connections": {},
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "a5bea5a3aec2f2daf0bd3b726eb40f8409637772271bf299c2d7a532de0e175c"
  }
}
sence drop box noduna ihtiyaç varmı google ile giriş yapınca bunuda kullanabileleim sadece beyin fırıdınası yap ayrıca 
{
  "nodes": [
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 3
          },
          "conditions": [
            {
              "id": "23146204-e08f-4fd6-89b4-4892f7086606",
              "leftValue": "",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "equals",
                "name": "filter.operator.equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.filter",
      "typeVersion": 2.3,
      "position": [
        224,
        0
      ],
      "id": "7ad655c5-373d-4ccd-a0a3-840a2cb178a7",
      "name": "Filter"
    }
  ],
  "connections": {},
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "a5bea5a3aec2f2daf0bd3b726eb40f8409637772271bf299c2d7a532de0e175c"
  }
}
buna 
{
  "nodes": [
    {
      "parameters": {
        "additionalFields": {}
      },
      "type": "n8n-nodes-base.googleTasks",
      "typeVersion": 1,
      "position": [
        224,
        16
      ],
      "id": "96a82ba6-3fb1-4c0b-8b5b-d02b6cff8989",
      "name": "Create a task"
    }
  ],
  "connections": {},
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "a5bea5a3aec2f2daf0bd3b726eb40f8409637772271bf299c2d7a532de0e175c"
  }
}

{
  "nodes": [
    {
      "parameters": {},
      "type": "n8n-nodes-base.googleTranslate",
      "typeVersion": 2,
      "position": [
        272,
        32
      ],
      "id": "ece8f6a5-3710-418f-9999-8a5f7c5dba8b",
      "name": "Translate a language"
    }
  ],
  "connections": {},
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "a5bea5a3aec2f2daf0bd3b726eb40f8409637772271bf299c2d7a532de0e175c"
  }
}
{
  "nodes": [
    {
      "parameters": {
        "resource": "calendar",
        "operation": "create",
        "additionalFields": {}
      },
      "type": "n8n-nodes-base.microsoftOutlook",
      "typeVersion": 2,
      "position": [
        256,
        16
      ],
      "id": "fcca6b9a-ede0-4fb9-956d-7e8a8b28008b",
      "name": "Create a calendar",
      "webhookId": "f9ae0f37-c8d1-4b80-8dc2-28b27a1fe68d"
    }
  ],
  "connections": {},
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "a5bea5a3aec2f2daf0bd3b726eb40f8409637772271bf299c2d7a532de0e175c"
  }
}
{
  "nodes": [
    {
      "parameters": {},
      "type": "n8n-nodes-base.merge",
      "typeVersion": 3.2,
      "position": [
        272,
        16
      ],
      "id": "46471870-3ce6-4a23-9f64-85de5210aa75",
      "name": "Merge"
    }
  ],
  "connections": {},
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "a5bea5a3aec2f2daf0bd3b726eb40f8409637772271bf299c2d7a532de0e175c"
  }
}
{
  "nodes": [
    {
      "parameters": {
        "jsCode": "// Loop over input items and add a new field called 'myNewField' to the JSON of each one\nfor (const item of $input.all()) {\n  item.json.myNewField = 1;\n}\n\nreturn $input.all();"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        336,
        48
      ],
      "id": "bd23d2c5-c86e-4bb8-bd83-a6fb734dd72d",
      "name": "Code in JavaScript"
    }
  ],
  "connections": {},
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "a5bea5a3aec2f2daf0bd3b726eb40f8409637772271bf299c2d7a532de0e175c"
  }
}
{
  "nodes": [
    {
      "parameters": {
        "operation": "sendAndWait",
        "user": {
          "__rl": true,
          "mode": "list",
          "value": ""
        },
        "options": {}
      },
      "type": "n8n-nodes-base.slack",
      "typeVersion": 2.4,
      "position": [
        320,
        32
      ],
      "id": "a43008f6-8de3-4a57-94be-05b310717eb4",
      "name": "Send a message",
      "webhookId": "6a010977-fca0-4df7-884c-de46fc2e306b"
    }
  ],
  "connections": {},
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "a5bea5a3aec2f2daf0bd3b726eb40f8409637772271bf299c2d7a532de0e175c"
  }
}
{
  "nodes": [
    {
      "parameters": {
        "operation": "sendAndWait",
        "options": {}
      },
      "type": "n8n-nodes-base.googleChat",
      "typeVersion": 1,
      "position": [
        32,
        16
      ],
      "id": "dfe037be-514a-4f5e-ac9d-ddcb2ba55b5a",
      "name": "Create a message",
      "webhookId": "e42c80bd-2ad4-4c88-9295-dc06e48c6d1c"
    },
    {
      "parameters": {
        "options": {}
      },
      "type": "n8n-nodes-base.emailReadImap",
      "typeVersion": 2.1,
      "position": [
        208,
        32
      ],
      "id": "24fc92ca-86b9-4e61-b6a4-196625ff77c8",
      "name": "Email Trigger (IMAP)"
    },
    {
      "parameters": {
        "operation": "sendAndWait",
        "options": {}
      },
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1.2,
      "position": [
        432,
        32
      ],
      "id": "f19402a3-eee4-44c9-a01e-78fe69bf44eb",
      "name": "Send a text message",
      "webhookId": "f520e416-4cba-4583-bffc-dcbc91b25340"
    },
    {
      "parameters": {
        "additionalFields": {}
      },
      "type": "n8n-nodes-base.microsoftOutlookTool",
      "typeVersion": 2,
      "position": [
        -96,
        32
      ],
      "id": "542f04f1-c4d1-48f1-b4dc-362893d138fc",
      "name": "Send a message in Microsoft Outlook",
      "webhookId": "5c7abca7-95d3-4439-a2c5-3d72f5e80b5a"
    },
    {
      "parameters": {
        "rules": {
          "values": [
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 3
                },
                "conditions": [
                  {
                    "leftValue": "",
                    "rightValue": "",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    },
                    "id": "50408825-d1d3-44d2-ab8c-a7428882d70b"
                  }
                ],
                "combinator": "and"
              }
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.4,
      "position": [
        96,
        -112
      ],
      "id": "7035767c-e500-4470-84cf-2a97cdedf7bf",
      "name": "Switch"
    }
  ],
  "connections": {
    "Email Trigger (IMAP)": {
      "main": [
        []
      ]
    }
  },
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "a5bea5a3aec2f2daf0bd3b726eb40f8409637772271bf299c2d7a532de0e175c"
  }
}