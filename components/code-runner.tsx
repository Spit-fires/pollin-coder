import CodeRunnerReact from "./code-runner-react";

export default function CodeRunner({
  code,
  language: _language,
  onRequestFix,
}: {
  code: string;
  language?: string;
  onRequestFix?: (e: string) => void;
}) {
  return <CodeRunnerReact code={code} onRequestFix={onRequestFix} />;
}
