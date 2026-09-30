UPDATE "Report" AS report
SET
  "messageContent" = message."content",
  "authorId" = message."authorId"
FROM "Message" AS message
WHERE report."messageId" = message."id"
  AND report."messageContent" = '';
