<!-- A.svelte -->
<script>
	import { onMount, onDestroy } from 'svelte';
	import B from './B.svelte';

	let interval;
	
	let foo = 1;
	let bar = 2;

	onMount(() => {
		interval = setInterval(() => {
			foo *= 2;
			bar *= 2;
		}, 1000);
	});

	onDestroy(() => {
		clearInterval(interval);
	});
</script>

<B bind:foo bind:bar />