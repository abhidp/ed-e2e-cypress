import {
  getLmsUserProfileFromHippo,
  createPrizeDrawFromEmily,
  addPrizeToDrawFromEmily,
  createPrizeFromEmily
} from '../helper/api-helper'

export const createPrizeDraw = (email: string, password: string, prizeDraw: object) => {
  return getLmsUserProfileFromHippo(email, password).then(profileResponse => {
    return createPrizeDrawFromEmily(prizeDraw, profileResponse.body.userApplicationId).then(
      response => {
        return response.body.id
      }
    )
  })
}

export const createPrize = (email: string, password: string, prizeName: string) => {
  return getLmsUserProfileFromHippo(email, password).then(profileResponse => {
    return createPrizeFromEmily(prizeName, profileResponse.body.userApplicationId).then(
      response => {
        return response.body.id
      }
    )
  })
}

export const createPrizeDrawWithPrize = (
  email: string,
  password: string,
  prizeDraw: object,
  prizeName: string
) => {
  return getLmsUserProfileFromHippo(email, password).then(profileResponse => {
    return createPrizeDrawFromEmily(prizeDraw, profileResponse.body.userApplicationId).then(
      prizeDrawResponse => {
        return createPrizeFromEmily(prizeName, profileResponse.body.userApplicationId).then(
          prizeItemResponse => {
            return addPrizeToDrawFromEmily(
              prizeDrawResponse.body.id,
              prizeItemResponse.body.id,
              profileResponse.body.userApplicationId
            )
          }
        )
      }
    )
  })
}
