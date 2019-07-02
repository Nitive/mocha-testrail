testcase('Case', () => {
  step('Step', () => {})

  expected('Failed expected', () => {
    throw new Error('Error!')
  })
})
