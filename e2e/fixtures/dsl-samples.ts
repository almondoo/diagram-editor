export const SIMPLE_DIAGRAM = `node a "Hello" { shape=rect color=#6366f1 }
node b "World" { shape=rect color=#f59e0b }
edge a -> b { label="connects" }
`;

export const GROUP_DIAGRAM = `group g1 "Group" { color=#6366f1
  node a "A" { shape=rect }
  node b "B" { shape=rect }
}
edge a -> b
`;
