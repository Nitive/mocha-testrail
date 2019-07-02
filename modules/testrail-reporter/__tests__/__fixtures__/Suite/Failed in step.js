testcase('Case', () => {
  step('Failed Step', () => {
    throw new Error('Error!')
  })
})
