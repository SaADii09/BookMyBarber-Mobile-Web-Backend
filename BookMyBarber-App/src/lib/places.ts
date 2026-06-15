import { api } from "./api";

export type PlacePrediction = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
};

export type PlaceDetails = {
  placeId: string;
  name: string | null;
  formattedAddress: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
};

export async function autocompletePlaces(input: string, lat?: number, lng?: number) {
  const { data } = await api.get("/app/places/autocomplete", {
    params: {
      input,
      lat,
      lng,
      cities: "Gujranwala,Lahore,Vehari",
    },
  });
  return (data.predictions ?? []) as PlacePrediction[];
}

export async function getPlaceDetails(placeId: string) {
  const { data } = await api.get("/app/places/details", { params: { placeId } });
  return data.place as PlaceDetails;
}
