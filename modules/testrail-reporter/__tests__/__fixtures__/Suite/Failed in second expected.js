testcase('Case', () => {
  step('Step', () => {})

  expected('Expected', () => {})

  expected('Failed expected', () => {
    throw new Error('Error!')
  })
})
