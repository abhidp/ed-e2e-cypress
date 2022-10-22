import { getLmsUserProfileFromHippo, updateAppSettingsFromEmily } from '../helper/api-helper'

export const updateAppSettings = (email: string, password: string) => {
  return getLmsUserProfileFromHippo(email, password).then(profileResponse => {
    return updateAppSettingsFromEmily(profileResponse.body.userApplicationId)
  })
}
