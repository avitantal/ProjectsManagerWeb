import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const steps = [
  { name: 'Lint', command: 'npm', args: ['run', 'lint'] },
  { name: 'Tests', command: 'npm', args: ['run', 'test:run'] },
  { name: 'Build', command: 'npm', args: ['run', 'build'] },
];

function buildInvocation(step) {
  if (step.command === 'npm' && process.env.npm_execpath) {
    return {
      command: process.execPath,
      args: [process.env.npm_execpath, ...step.args],
    };
  }

  if (process.platform === 'win32') {
    return {
      command: `${step.command}.cmd`,
      args: step.args,
    };
  }

  return {
    command: step.command,
    args: step.args,
  };
}

function runStep(step) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const invocation = buildInvocation(step);
    let child;
    let stdout = '';
    let stderr = '';

    try {
      child = spawn(invocation.command, invocation.args, {
        cwd: process.cwd(),
        env: process.env,
        shell: false,
      });
    } catch (error) {
      resolve({
        ...step,
        code: 1,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      resolve({
        ...step,
        code: 1,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim(),
      });
    });
    child.on('close', (code) => {
      resolve({
        ...step,
        code: code ?? 1,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
      });
    });
  });
}

function fence(value) {
  const text = value.trim();
  return text ? `\`\`\`text\n${text}\n\`\`\`` : '_No output_';
}

function formatDuration(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

async function main() {
  const reportDir = path.join(process.cwd(), '.qa', 'test-runs');
  await mkdir(reportDir, { recursive: true });

  const started = new Date();
  const results = [];

  console.log('QA run started');
  for (const step of steps) {
    process.stdout.write(`- ${step.name}... `);
    const result = await runStep(step);
    results.push(result);
    console.log(result.code === 0 ? `PASS (${formatDuration(result.durationMs)})` : `FAIL (${formatDuration(result.durationMs)})`);
  }

  const failed = results.filter((result) => result.code !== 0);
  const stamp = started.toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `qa-run-${stamp}.md`);
  const summary = failed.length === 0 ? 'PASS' : 'FAIL';

  const report = [
    `# QA Run - ${summary}`,
    '',
    `- Date: ${started.toISOString()}`,
    `- Project: ProjectsManagerWeb`,
    `- Result: ${summary}`,
    '',
    '## Summary',
    '',
    '| Step | Status | Duration |',
    '| --- | --- | --- |',
    ...results.map((result) => `| ${result.name} | ${result.code === 0 ? 'PASS' : 'FAIL'} | ${formatDuration(result.durationMs)} |`),
    '',
    '## Details',
    '',
    ...results.flatMap((result) => [
      `### ${result.name}`,
      '',
      `Command: \`${result.command} ${result.args.join(' ')}\``,
      '',
      `Exit code: ${result.code}`,
      '',
      'Stdout:',
      '',
      fence(result.stdout),
      '',
      'Stderr:',
      '',
      fence(result.stderr),
      '',
    ]),
  ].join('\n');

  await writeFile(reportPath, report, 'utf8');

  console.log(`QA report: ${path.relative(process.cwd(), reportPath)}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
