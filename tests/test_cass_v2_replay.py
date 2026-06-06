from __future__ import annotations

import unittest

from stackcert.proof.cass_v2_replay import aggregate_blocks, enumerate_candidates, group_outputs


class CassV2ReplayTest(unittest.TestCase):
    def test_aggregation_rules(self) -> None:
        self.assertTrue(aggregate_blocks([False, True, False], "serial_veto"))
        self.assertFalse(aggregate_blocks([False, True, False], "majority"))
        self.assertTrue(aggregate_blocks([False, True, True], "majority"))
        self.assertFalse(aggregate_blocks([False, True, True], "unanimous_block"))
        self.assertTrue(aggregate_blocks([False, True, True], "quota_2"))

    def test_candidate_replay_can_prefer_larger_committee(self) -> None:
        examples = [
            {"example_id": "a1", "label_side": "A"},
            {"example_id": "a2", "label_side": "A"},
            {"example_id": "n1", "label_side": "N"},
            {"example_id": "n2", "label_side": "N"},
        ]
        outputs = [
            # g1 is benign-friendly but misses both unsafe examples.
            {"agent_id": "g1", "example_id": "a1", "block_decision": 0},
            {"agent_id": "g1", "example_id": "a2", "block_decision": 0},
            {"agent_id": "g1", "example_id": "n1", "block_decision": 0},
            {"agent_id": "g1", "example_id": "n2", "block_decision": 0},
            # g2 and g3 each catch one unsafe example while passing benign examples.
            {"agent_id": "g2", "example_id": "a1", "block_decision": 1},
            {"agent_id": "g2", "example_id": "a2", "block_decision": 0},
            {"agent_id": "g2", "example_id": "n1", "block_decision": 0},
            {"agent_id": "g2", "example_id": "n2", "block_decision": 0},
            {"agent_id": "g3", "example_id": "a1", "block_decision": 0},
            {"agent_id": "g3", "example_id": "a2", "block_decision": 1},
            {"agent_id": "g3", "example_id": "n1", "block_decision": 0},
            {"agent_id": "g3", "example_id": "n2", "block_decision": 0},
        ]
        by_agent = group_outputs(outputs)
        old_rows = enumerate_candidates(
            examples=examples,
            by_agent=by_agent,
            agents=["g1", "g2", "g3"],
            lambda_value=5,
            max_k=2,
            rules=("serial_veto",),
        )
        new_rows = enumerate_candidates(
            examples=examples,
            by_agent=by_agent,
            agents=["g1", "g2", "g3"],
            lambda_value=5,
            max_k=3,
            rules=None,
        )
        self.assertGreaterEqual(new_rows[0]["goal_score"], old_rows[0]["goal_score"])
        self.assertEqual(new_rows[0]["release_decision"], "pass")


if __name__ == "__main__":
    unittest.main()
