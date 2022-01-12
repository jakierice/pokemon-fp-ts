import React from "react";
import axios from "axios";

import * as D from "io-ts/lib/Decoder";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as O from "fp-ts/Option";
import { flow, pipe } from "fp-ts/function";
import * as RD from "@devexperts/remote-data-ts";

import { ThreeDots } from "react-loader-spinner";

import "./styles.css";
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";

const pokemonDetailsD = D.partial({
  id: D.number,
  name: D.string,
  base_experience: D.number,
  height: D.number,
  is_default: D.boolean,
  order: D.number,
  weight: D.number
});

type PokemonDetails = D.TypeOf<typeof pokemonDetailsD>;

export default function App() {
  const [pokemonDetails, setPokemonDetails] = React.useState<
    RD.RemoteData<string, PokemonDetails>
  >(RD.initial);

  const [randomPokemonId, setRandomPokemonId] = React.useState<
    O.Option<number>
  >(O.none);

  const onThrowPokeballClick = () =>
    setRandomPokemonId(O.some(Math.floor(Math.random() * 100) + 1));

  React.useEffect(() => {
    setPokemonDetails(RD.pending);

    pipe(
      randomPokemonId,
      TE.fromOption(
        () =>
          "Throw your first Pokeball by clicking the button to catch a random Pokemon!"
      ),
      TE.chain((randomId) =>
        TE.tryCatch(
          () => axios.get(`https://pokeapi.co/api/v2/pokemon/${randomId}`),
          (error) => `Request failed with error: ${error}`
        )
      ),
      TE.map(({ data }) => data),
      TE.chainEitherK(flow(pokemonDetailsD.decode, E.mapLeft(D.draw))),
      TE.match(
        flow(RD.failure, setPokemonDetails),
        flow(RD.success, setPokemonDetails)
      )
    )();
  }, [randomPokemonId]);

  return (
    <main className="App">
      <h1>Catch a random Pokemon!</h1>
      <button onClick={onThrowPokeballClick}>
        {pipe(
          randomPokemonId,
          O.match(
            () => "Throw first Pokeball",
            () => "Use another Pokeball"
          )
        )}
      </button>
      {pipe(
        pokemonDetails,
        RD.fold(
          () => <></>,
          () => (
            <ThreeDots
              type="ThreeDots"
              color="#00BFFF"
              height={80}
              width={80}
            />
          ),
          (error) => <pre>{error}</pre>,
          (details) => (
            <div className="pokemon">
              <h2>{details.name}</h2>
              <ul className="pokemon__details-list">
                <li>Base XP: {details.base_experience}</li>
                <li>Height: {details.height}</li>
                <li>Weight: {details.weight}</li>
              </ul>
            </div>
          )
        )
      )}
    </main>
  );
}
