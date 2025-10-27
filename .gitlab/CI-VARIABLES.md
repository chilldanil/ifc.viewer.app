# GitLab CI/CD Variables Configuration

## Current State

The current CI/CD pipeline **does not require any manual variables**.  
All configuration is defined inside `.gitlab-ci.yml`.

---

## Future Use

If you ever need to add variables (for example, API keys), follow these steps:

### How to Add Variables

1. Navigate to your GitLab project
2. Go to **Settings → CI/CD**
3. Expand **Variables** section
4. Click **Add Variable**
5. Configure the variable with appropriate settings

### Example Variables

```bash
# Application variables
HF_TOKEN=hf_exampletoken
NODE_VERSION=20


## Resources

- [GitLab CI/CD Variables Documentation](https://docs.gitlab.com/ee/ci/variables/)
- [GitLab Environment Variables](https://docs.gitlab.com/ee/ci/environments/)
- [Protected Variables](https://docs.gitlab.com/ee/ci/variables/#protected-cicd-variables)

---

**Last Updated:** October 12, 2025  
**Maintained By:** @000000000014BA09F
