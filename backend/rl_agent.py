import random
from collections import defaultdict


class QLearningAgent:

    def __init__(self):

        # Q table → state : [do_nothing , send_rescue]
        self.q_table = defaultdict(lambda: [0, 0])

        self.learning_rate = 0.1
        self.discount_factor = 0.9
        self.epsilon = 0.2  # exploration probability

    def get_state(self, ward):
        """
        Convert ward data into a discrete RL state.
        """

        severity = ward["severity"]
        urgency = ward["urgency"]

        return (severity, urgency)

    def choose_action(self, state):
        """
        ε-greedy action selection
        """

        # exploration
        if random.random() < self.epsilon:
            return random.choice([0, 1])

        # exploitation
        return self.q_table[state].index(max(self.q_table[state]))

    def update_q(self, state, action, reward, next_state):
        """
        Q-learning update rule
        """

        best_next = max(self.q_table[next_state])
        current_q = self.q_table[state][action]

        new_q = current_q + self.learning_rate * (
            reward + self.discount_factor * best_next - current_q
        )

        self.q_table[state][action] = new_q

    def calculate_reward(self, ward_before, ward_after):
        """
        Reward function for rescue success
        """

        before = ward_before["severity"]
        after = ward_after["severity"]

        # if rescue reduced severity → good
        if after < before:
            return 10

        # if severity unchanged → neutral
        elif after == before:
            return -1

        # if severity increased → bad decision
        else:
            return -5