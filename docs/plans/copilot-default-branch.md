# Repair missing origin HEAD in the Copilot launcher

The first live auto run failed after fetching because this checkout had no symbolic refs/remotes/origin/HEAD. Git does not guarantee that local pointer exists. Issue selection succeeded; the failure occurred before reservation creation or model startup.

Scope: refresh origin's default-branch pointer from the remote before resolving the worker base. Do not guess main/master. Fail visibly if the remote cannot identify a branch. Preserve existing work and existing reservation behavior.

Acceptance: reproduce a repository with a valid non-main remote default branch but no local origin/HEAD; verify discovery returns the remote branch and repairs the pointer. Run that regression before implementation, then full npm test/build. No model run is needed. The user's checkout has already been repaired with git remote set-head origin --auto.

Evidence: the real temporary repository confirmed origin/HEAD was absent while origin/release existed. The baseline regression failed because discovery/repair behavior was missing. After implementation the regression passed, all346tests passed, and the production build passed. Live read-only preview still selected #25 with no model use or reservations. Skill assessment: this localized Git repair belongs in the launcher and its tests, not a new skill.
