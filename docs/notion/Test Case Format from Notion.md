Got it, Abishek. For bulk insert into “Maaxly Test Cases,” send me a JSON payload that I can pass directly to create pages in the data source. Here’s the exact format I can understand and use.

### Preferred bulk JSON format

- Top-level key: pages
- Each item in pages is one test case
- Keys inside properties must match your data source’s property names exactly

Example with two rows:

{

"parentDataSourceUrl": "[Maaxly Test Cases](https://www.notion.so/8e387f94f10442038680b7446cfeac66/ds/291821bd1bd98075bf3c000b3c398d29?db=291821bd1bd98067ae9ff8e903a399e0&pvs=21)",

"pages": [

{

"properties": {

"Name": "Login: successful sign-in",

"Status": "Ready",

"Priority": "P1 - High",

"Type": "E2E",

"Area": ["Frontend", "Auth"],

"Feature": "app/routes/login.tsx",

"Environment": "Staging",

"Owner": ["[user://14dd872b-594c-812e-9aaa-00024b6a1e40](user://14dd872b-594c-812e-9aaa-00024b6a1e40)"],

"Reporter": ["[user://14dd872b-594c-812e-9aaa-00024b6a1e40](user://14dd872b-594c-812e-9aaa-00024b6a1e40)"],

"Preconditions": "User exists and is verified",

"Steps": "1) Open login pagen2) Enter valid credsn3) Click Sign inn4) Assert dashboard visible",

"Expected Result": "User lands on dashboard with correct greeting",

"Actual Result": "Pending execution",

"Run Result": "Skipped",

"Notes": "Add negative cases separately",

"Tags": ["UI", "API"],

"Links": "https://example.com/tc-123",

"Evidence": "",

"Trace IDs": "",

"Test Duration": 1.7,

"date:Created:start": "2025-10-19",

"date:Created:is_datetime": 0,

"date:Last Updated:start": "2025-10-19",

"date:Last Updated:is_datetime": 0

}

},

{

"properties": {

"Name": "Messaging: producer publishes event",

"Status": "Draft",

"Priority": "P0 - Critical",

"Type": "Integration",

"Area": ["Backend", "Messaging", "Kafka"],

"Feature": "server/kafka/producer.js",

"Environment": "Local",

"Preconditions": "Kafka docker compose is running",

"Steps": "1) POST /messagesn2) Assert 200n3) Verify topic event",

"Expected Result": "Message persisted and event published",

"Actual Result": "Pending execution",

"Run Result": "Skipped",

"Tags": ["API", "Backend", "Performance"],

"Test Duration": 1.2,

"date:Created:start": "2025-10-19",

"date:Created:is_datetime": 0

}

}

]

}

### Property value rules you can rely on

- Required
    - Name: string
- Selects
    - Environment: one of Local, Development, Staging, Production
    - Priority: one of P0 - Critical, P1 - High, P2 - Medium, P3 - Low
    - Run Result: one of Passed, Failed, Blocked, Skipped
    - Status: one of Draft, Ready, In Progress, Blocked, Failed, Passed, Deprecated
    - Type: one of Unit, Integration, Component, E2E, Contract, Performance, Security, Accessibility
- Multi-selects
    - Area: array of any of Frontend, Backend, Kafka, Redis, Search, Profiles, Messaging, Auth, DevOps, UI/UX, Theme
    - Tags: array of any of UI, Backend, Security, Performance, Data, API, Mobile, Documentation
- People
    - Owner and Reporter: array of user IDs. Use "[user://14dd872b-594c-812e-9aaa-00024b6a1e40](user://14dd872b-594c-812e-9aaa-00024b6a1e40)" for yourself.
- Numbers
    - Test Duration: number
- URLs
    - Links: string URL
- Text
    - Feature, Preconditions, Steps, Expected Result, Actual Result, Notes, Evidence, Trace IDs: string
- Dates
    - Use expanded keys:
        - date:<Column>:start = ISO date or datetime string
        - date:<Column>:end = ISO date or datetime string (only if you want a range)
        - date:<Column>:is_datetime = 0 for date, 1 for datetime
    - Columns: Created, Last Updated, Last Run

### Bulk size and batching

- I can insert up to 10 pages per call. If you have more, send multiple batches using the same format.

### Minimal row example

{

"parentDataSourceUrl": "[Maaxly Test Cases](https://www.notion.so/8e387f94f10442038680b7446cfeac66/ds/291821bd1bd98075bf3c000b3c398d29?db=291821bd1bd98067ae9ff8e903a399e0&pvs=21)",

"pages": [

{ "properties": { "Name": "Search: debounce works", "Status": "Draft", "Type": "Unit" } }

]

}

If you share your dataset in this JSON shape, I can insert it in batches right away.