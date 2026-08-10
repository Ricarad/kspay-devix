# knowledge（预留）

该目录未来保存跨需求、可长期复用的知识，例如领域词汇、稳定架构、常用排障和外部系统边界。

知识读取是从 `clarification` 进入 `design` 的必需 gate：根据已澄清的领域、仓库、模块和术语定向读取，并把来源记录到 `change.yaml.resume.knowledge_sources`；没有相关内容时显式记录 `knowledge_status: not_found`，而不是静默跳过。

需求进行中的事实仍留在 `changes/<change-id>/`。只有经过验证、脱离单一需求仍成立的内容，才在需求关闭时提炼到这里，避免把临时结论误当成长期知识。
