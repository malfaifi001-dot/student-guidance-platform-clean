$schemaPath = "prisma\schema.prisma"

if (!(Test-Path $schemaPath)) {
  throw "?? ??? ?????? ??? prisma\schema.prisma"
}

$script:schema = Get-Content -Path $schemaPath -Raw

function EnsureEnum {
  param(
    [string]$EnumName,
    [string[]]$Values
  )

  if ($script:schema -notmatch "enum\s+$EnumName\s*\{") {
    $body = ($Values | ForEach-Object { "  $_" }) -join "`n"
    $script:schema += "`n`nenum $EnumName {`n$body`n}`n"
    return
  }

  foreach ($value in $Values) {
    $pattern = "enum\s+$EnumName\s*\{(?<body>[\s\S]*?)\n\}"
    $match = [regex]::Match($script:schema, $pattern)
    if ($match.Success -and $match.Groups["body"].Value -notmatch "(?m)^\s*$value\s*$") {
      $replacement = $match.Value -replace "\n\}", "`n  $value`n}"
      $script:schema = $script:schema.Remove($match.Index, $match.Length).Insert($match.Index, $replacement)
    }
  }
}

function EnsureModelField {
  param(
    [string]$ModelName,
    [string]$FieldKey,
    [string]$FieldLine
  )

  $pattern = "model\s+$ModelName\s*\{(?<body>[\s\S]*?)\n\}"
  $match = [regex]::Match($script:schema, $pattern)

  if (!$match.Success) {
    return
  }

  if ($match.Groups["body"].Value -notmatch "(?m)^\s*$FieldKey\s+") {
    $replacement = $match.Value -replace "\n\}", "`n  $FieldLine`n}"
    $script:schema = $script:schema.Remove($match.Index, $match.Length).Insert($match.Index, $replacement)
  }
}

EnsureEnum -EnumName "ImportSessionStatus" -Values @("DRAFT", "PARSED", "COMMITTED", "FAILED", "CANCELED")
EnsureEnum -EnumName "ImportRowStatus" -Values @("PENDING", "VALID", "INVALID", "CREATED", "UPDATED", "SKIPPED", "CONFLICT")
EnsureEnum -EnumName "Gender" -Values @("UNKNOWN")

EnsureModelField -ModelName "SchoolAccount" -FieldKey "studentImportSessions" -FieldLine "studentImportSessions StudentImportSession[]"

if ($script:schema -notmatch "model\s+StudentImportSession\s*\{") {
  $script:schema += @'

model StudentImportSession {
  id              String        @id @default(cuid())
  schoolAccountId String
  schoolAccount   SchoolAccount @relation(fields: [schoolAccountId], references: [id], onDelete: Cascade)

  title  String
  source String              @default("NOOR_EXCEL")
  status ImportSessionStatus @default(DRAFT)

  totalRows     Int @default(0)
  validRows     Int @default(0)
  invalidRows   Int @default(0)
  createdCount  Int @default(0)
  updatedCount  Int @default(0)
  skippedCount  Int @default(0)
  conflictCount Int @default(0)

  files StudentImportFile[]
  rows  StudentImportRow[]

  committedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([schoolAccountId])
  @@index([status])
}

model StudentImportFile {
  id        String               @id @default(cuid())
  sessionId String
  session   StudentImportSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  fileName String
  mimeType String?
  size     Int?
  rowCount Int     @default(0)

  createdAt DateTime @default(now())

  @@index([sessionId])
}

model StudentImportRow {
  id        String               @id @default(cuid())
  sessionId String
  session   StudentImportSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  rowIndex Int
  status   ImportRowStatus @default(PENDING)

  fullName      String
  nationalId    String?
  gender        Gender  @default(UNKNOWN)
  stage         String?
  grade         String?
  classroom     String?
  guardianName  String?
  guardianPhone String?

  matchedStudentId String?
  errorMessage     String?
  rawJson          Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([sessionId])
  @@index([nationalId])
  @@index([status])
}
