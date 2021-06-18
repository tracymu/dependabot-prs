# dependabot-prs
CLI tool to help manage dependabot duties

![image](https://user-images.githubusercontent.com/3888414/122491862-1d133780-d028-11eb-8606-f247870f6944.png)


## Installation
Note you will need Node 14

#### Option 1
Clone the repo, then inside that folder install the dependabot-pr commands globally with
`npm install -g .`

#### Option 2
`npm install -g git@github.com:blake-education/dependabot-prs.git`


#### Get Github permissions
Go to https://github.com/settings/tokens and make a new personal access token

Give it these permissions
 - read:org 
 - read:repo_hook
 - repo

#### Set up environment variables
e.g. in your  `.zshenv`
 ```
export DEPENDABOT_PRS_GITHUB_TOKEN=(the personal access token you got above)
export DEPENDABOT_PRS_REPOS=mathseeds-prime-client fast-phonics-client #etc
```

### Commands

`dependabot-prs list`

The coloured dot reflects the state of CI

The emojis:
```
↺ - can't merge because the branch isn't up to date with develop
✋ - waiting for a review to be mergeable
🧹 - merge commit cannot be cleanly created. i.e. merge conflict
✔ - mergeable - already been approved by someone
```

`dependabot-prs approve <repo-name> <pr-number>`

This will make a comment under your github name telling dependabot to merge that PR


### Auto completion:

Paste this in your .zshrc (or whatever) to get autocompletion of 
 - commands
 - repo names
 - list of open PRs 

```
###-begin-dependabot-prs-completions-###
#
# yargs command completion script
#
# Installation: ../../.asdf/installs/nodejs/14.16.0/.npm/bin/dependabot-prs completion >> ~/.zshrc
#    or ../../.asdf/installs/nodejs/14.16.0/.npm/bin/dependabot-prs completion >> ~/.zsh_profile on OSX.
#
_dependabot-prs_yargs_completions()
{
  local reply
  local si=$IFS
  IFS=$'
' reply=($(COMP_CWORD="$((CURRENT-1))" COMP_LINE="$BUFFER" COMP_POINT="$CURSOR" dependabot-prs --get-yargs-completions "${words[@]}"))
  IFS=$si
  _describe 'values' reply
}
compdef _dependabot-prs_yargs_completions dependabot-prs
###-end-dependabot-prs-completions-###
```
