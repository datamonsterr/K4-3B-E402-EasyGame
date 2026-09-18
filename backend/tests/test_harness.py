from __future__ import annotations

import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from agent import DiscordLogisticsAgentHarness, load_default_system_prompt, load_default_tools
from providers import make_provider
from tools import TOOL_FUNCTIONS


class AgentHarnessTests(unittest.TestCase):
    def test_system_prompt_and_tools_loading(self):
        prompt = load_default_system_prompt()
        self.assertIn("Identity", prompt)
        self.assertIn("Track B", prompt)
        self.assertIn("Nguồn Sự Thật", prompt)

        tools = load_default_tools()
        self.assertGreater(len(tools), 0)
        tool_names = [t["function"]["name"] for t in tools]
        self.assertIn("lookup_official_notices", tool_names)
        self.assertIn("clarify_query", tool_names)
        self.assertIn("escalate_to_ta", tool_names)
        self.assertIn("scan_unanswered_radar", tool_names)
        self.assertIn("generate_daily_digest", tool_names)

    def test_harness_execution_with_mock_provider(self):
        provider = make_provider("mock")
        harness = DiscordLogisticsAgentHarness(provider)

        # 1. Ask about Lab 1 deadline -> triggers lookup_official_notices
        run1 = harness.run([{"role": "user", "content": "Hạn nộp bài Lab 1 là khi nào?"}])
        self.assertGreater(len(run1.tool_calls), 0)
        self.assertEqual(run1.tool_calls[0].name, "lookup_official_notices")
        self.assertEqual(len(run1.tool_results), 1)
        self.assertEqual(run1.tool_results[0]["result"]["status"], "success")

        # 2. Ambiguous query -> triggers clarify_query
        run2 = harness.run([{"role": "user", "content": "hạn nộp là khi nào?"}])
        self.assertGreater(len(run2.tool_calls), 0)
        self.assertEqual(run2.tool_calls[0].name, "clarify_query")
        self.assertEqual(run2.tool_results[0]["result"]["status"], "waiting_for_user")

        # 3. Unknown lab -> triggers escalate_to_ta
        run3 = harness.run([{"role": "user", "content": "Hạn nộp Lab 07 khi nào?"}])
        self.assertGreater(len(run3.tool_calls), 0)
        self.assertEqual(run3.tool_calls[0].name, "escalate_to_ta")
        self.assertEqual(run3.tool_results[0]["result"]["status"], "escalated")


if __name__ == "__main__":
    unittest.main()
