import { notFound } from "next/navigation";
import { AppError } from "./errors";

/** Await a service call in a page; a missing row becomes the 404 page instead of an error screen. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  }
}
